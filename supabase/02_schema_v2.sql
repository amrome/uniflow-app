-- =====================================================================
-- UniFlow schema v2: patch on top of 01_schema.sql
-- Run once in: Supabase Dashboard -> SQL Editor, AFTER 01_schema.sql and BEFORE 03_seed.sql.
--
-- What this changes (all driven by what the app actually shows):
--   1. Bilingual text: *_en / *_ar column pairs
--   2. Stable `slug` ids next to the uuids (the app's routes use slugs)
--   3. Roles come from a pre-approved email list (`staff_emails`), not only the email domain
--   4. Student Affairs becomes a live QUEUE (replaces the helpdesk tickets tables)
--   5. Parking: paid zone with real slots + free sensor zones with live counts
--   6. RPCs for the multi-step actions (place order, reserve parking, book queue ticket, ...)
--   7. Security fixes (orders.total can't be forged, drafts hidden, university ID locked, ...)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. NEW ENUMS
-- ---------------------------------------------------------------------
create type public.payment_method      as enum ('mada','cash','applePay','stcPay');
create type public.availability_status as enum ('available','away','not_available');
create type public.slot_type           as enum ('CLS','CP','OH','DD','PM','RS');  -- class, prep, office hrs, dept duties, project mtgs, research
create type public.parking_kind        as enum ('paid','free');
create type public.queue_status        as enum ('waiting','serving','served','cancelled');

-- ---------------------------------------------------------------------
-- 2. LOOKUP: MAJORS
-- ---------------------------------------------------------------------
create table public.majors (
  key        text primary key,
  name_en    text not null,
  name_ar    text not null,
  short_en   text not null,
  short_ar   text not null,
  sort_order int  not null default 0
);

-- ---------------------------------------------------------------------
-- 3. PROFILES, STAFF EMAILS, SIGN-UP TRIGGER
-- ---------------------------------------------------------------------
alter table public.profiles alter column email drop not null;      -- anonymous guests have no email
alter table public.profiles
  add column major_key text references public.majors(key),
  add column level     smallint check (level between 1 and 12);

-- Pre-approved staff list. Anyone whose (verified) email is listed gets that role at sign-up.
--   instructor -> also linked to the matching instructors.email row
--   club_id    -> also made admin of that club (their profile role stays 'student')
create table public.staff_emails (
  email   text primary key check (email = lower(email)),
  role    public.user_role not null,
  club_id uuid references public.clubs(id) on delete cascade,
  note    text
);
alter table public.staff_emails enable row level security;          -- no policies: dashboard / service role only

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role  public.user_role;
  v_staff public.staff_emails;
  v_uid   text;
begin
  if new.email is not null then
    select * into v_staff from public.staff_emails where email = lower(new.email);
    if v_staff.email is not null then
      v_role := v_staff.role;
    else
      select role into v_role from public.allowed_domains
      where lower(domain) = lower(split_part(new.email, '@', 2));
    end if;
    -- 202311430@yu.edu.sa  ->  university id 2023-11430
    if new.email ~ '^[0-9]{9}@' then
      v_uid := substr(new.email, 1, 4) || '-' || substr(new.email, 5, 5);
    end if;
  end if;

  -- Guests (anonymous sign-in) pass their phone/email as 'contact' in the sign-in metadata.
  insert into public.profiles (id, email, full_name, role, university_id, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(v_role, 'guest'),
    v_uid,
    nullif(new.raw_user_meta_data->>'contact', '')
  );

  if v_staff.club_id is not null then
    insert into public.club_members (club_id, user_id, role)
    values (v_staff.club_id, new.id, 'admin')
    on conflict (club_id, user_id) do update set role = 'admin';
  end if;

  if v_role = 'instructor' then
    update public.instructors set profile_id = new.id
    where lower(email) = lower(new.email) and profile_id is null;
  end if;

  return new;
end $$;

-- Users edit only these themselves. University ID, e-mail, major and level are university-managed.
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, phone, avatar_url, push_token) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 4. FOOD
-- ---------------------------------------------------------------------
alter table public.restaurants rename column name        to name_en;
alter table public.restaurants rename column description to description_en;
alter table public.restaurants rename column location    to location_en;
alter table public.restaurants
  add column slug           text unique,
  add column name_ar        text,
  add column description_ar text,
  add column location_ar    text,
  add column cuisine_en     text,
  add column cuisine_ar     text,
  add column prep_min       int  not null default 10 check (prep_min >= 0),
  add column rating         numeric(2,1) check (rating between 0 and 5),
  add column rating_count   int  not null default 0,
  add column coming_soon    boolean not null default false,
  add column sort_order     int     not null default 0;

alter table public.menu_items rename column name        to name_en;
alter table public.menu_items rename column description to description_en;
alter table public.menu_items
  add column slug           text unique,
  add column name_ar        text,
  add column description_ar text,
  add column emoji          text,
  add column bg             text,
  add column popular        boolean not null default false,
  add column sort_order     int     not null default 0;

create table public.favorite_restaurants (
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  primary key (user_id, restaurant_id)
);

-- "Your favorite order": one saved basket per user per restaurant.  lines = [{"menu_item_id": uuid, "qty": n}]
create table public.favorite_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  lines         jsonb not null,
  times_ordered int   not null default 1,
  created_at    timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

create sequence public.order_number_seq start 10432;
grant usage, select on sequence public.order_number_seq to authenticated;

alter table public.orders
  add column order_number   text not null default ('UF-' || nextval('public.order_number_seq')::text),
  add column payment_method public.payment_method not null default 'mada',
  add column customer_name  text;
create unique index orders_order_number_key on public.orders (order_number);

-- The kitchen sees who the order is for without being able to read the whole profile
create or replace function public.orders_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.customer_name := (select nullif(full_name, '') from public.profiles where id = new.user_id);
  return new;
end $$;

create trigger orders_before_insert before insert on public.orders
  for each row execute function public.orders_before_insert();

-- Clients may no longer set `total` (or user_id/status) on insert: only these columns.
revoke insert on public.orders from anon, authenticated;
grant  insert (restaurant_id, pickup_time, notes, payment_method) on public.orders to authenticated;

-- One call = one order + its items, atomically. Prices and totals come from the menu (triggers).
-- p_items: [{"menu_item_id": uuid, "quantity": n}, ...]
create or replace function public.place_order(
  p_restaurant uuid,
  p_items      jsonb,
  p_pickup     timestamptz default null,
  p_payment    public.payment_method default 'mada',
  p_notes      text default null
) returns public.orders
language plpgsql security invoker set search_path = public as $$
declare
  v_prep  int;
  v_order public.orders;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  select prep_min into v_prep from public.restaurants
  where id = p_restaurant and is_open and not coming_soon;
  if not found then raise exception 'This restaurant is not taking orders'; end if;

  insert into public.orders (restaurant_id, pickup_time, payment_method, notes)
  values (p_restaurant, coalesce(p_pickup, now() + make_interval(mins => v_prep)), p_payment, p_notes)
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, quantity)
  select v_order.id, (e->>'menu_item_id')::uuid, (e->>'quantity')::int
  from jsonb_array_elements(p_items) e;

  select * into v_order from public.orders where id = v_order.id;   -- total was recalculated by trigger
  return v_order;
end $$;

-- ---------------------------------------------------------------------
-- 5. TRANSPORT
-- ---------------------------------------------------------------------
alter table public.shuttle_routes rename column name to name_en;
alter table public.shuttle_routes
  add column slug      text unique,
  add column name_ar   text,
  add column direction text check (direction in ('fromCampus','toCampus'));

-- The app's timetable is a flat list of departure times per direction (stop is optional).
alter table public.shuttle_timetable alter column stop_id drop not null;

-- University admins replace one direction's whole timetable atomically (Shuttle Schedule editor).
-- p_times: {'08:45','09:45',...}
create or replace function public.save_shuttle_times(p_direction text, p_times text[])
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_route uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  select id into v_route from public.shuttle_routes where direction = p_direction;
  if v_route is null then raise exception 'Unknown direction'; end if;
  delete from public.shuttle_timetable where route_id = v_route;
  insert into public.shuttle_timetable (route_id, departure_time)
  select v_route, t::time from unnest(p_times) t;
end $$;

alter table public.vehicles rename column name to name_en;
alter table public.vehicles
  add column slug       text unique,
  add column name_ar    text,
  add column near_en    text,
  add column near_ar    text,
  add column sort_order int not null default 0;

-- ---------------------------------------------------------------------
-- 6. PARKING
-- ---------------------------------------------------------------------
alter table public.parking_lots rename column name     to name_en;
alter table public.parking_lots rename column location to near_en;
alter table public.parking_lots
  add column slug       text unique,
  add column name_ar    text,
  add column near_ar    text,
  add column kind       public.parking_kind not null default 'free',
  add column price      numeric(8,2) check (price >= 0),   -- paid zone: SAR per day
  add column capacity   int check (capacity > 0),          -- free zones: sensor-fed
  add column free_count int check (free_count >= 0),
  add column hint_en    text,
  add column hint_ar    text,
  add column sort_order int not null default 0,
  add constraint parking_lots_kind_check check (
    (kind = 'paid' and price is not null) or
    (kind = 'free' and capacity is not null and free_count is not null and free_count <= capacity)
  );

alter table public.parking_slots add column is_occupied boolean not null default false;  -- sensor-fed

alter table public.parking_reservations
  add column amount         numeric(8,2) not null default 0,
  add column payment_method public.payment_method;

-- A free slot = active, not sensor-occupied, and not reserved in the window
create or replace function public.parking_available_slots(p_lot uuid, p_start timestamptz, p_end timestamptz)
returns setof public.parking_slots
language sql stable security definer set search_path = public as $$
  select s.*
  from public.parking_slots s
  where s.lot_id = p_lot
    and s.is_active
    and not s.is_occupied
    and not exists (
      select 1 from public.parking_reservations r
      where r.slot_id = s.id
        and r.status = 'active'
        and tstzrange(r.starts_at, r.ends_at) && tstzrange(p_start, p_end)
    );
$$;

-- Everything the Parking screen needs in one read (counts only, no user data)
create view public.parking_zones as
select
  l.id, l.slug, l.name_en, l.name_ar, l.near_en, l.near_ar, l.kind, l.price,
  l.hint_en, l.hint_ar, l.sort_order,
  case when l.kind = 'paid'
       then (select count(*) from public.parking_slots s where s.lot_id = l.id and s.is_active)::int
       else l.capacity end as total,
  case when l.kind = 'paid'
       then (select count(*) from public.parking_available_slots(l.id, now(), now() + interval '1 minute'))::int
       else l.free_count end as free
from public.parking_lots l;

-- Reserve today's spot in the paid zone. The DB picks the slot (lowest free label); two people
-- can never get the same one, and a user can only hold one active reservation.
create or replace function public.reserve_parking(p_lot uuid, p_method public.payment_method)
returns public.parking_reservations
language plpgsql security definer set search_path = public as $$
declare
  v_lot  public.parking_lots;
  v_slot uuid;
  v_end  timestamptz;
  v_res  public.parking_reservations;
begin
  if not public.is_member() then raise exception 'Parking reservations are for students and staff'; end if;

  select * into v_lot from public.parking_lots where id = p_lot and kind = 'paid';
  if not found then raise exception 'This zone cannot be reserved'; end if;

  -- reservation lasts until midnight, Riyadh time
  v_end := (date_trunc('day', now() at time zone 'Asia/Riyadh') + interval '1 day') at time zone 'Asia/Riyadh';

  select s.id into v_slot
  from public.parking_slots s
  where s.lot_id = p_lot and s.is_active and not s.is_occupied
    and not exists (
      select 1 from public.parking_reservations r
      where r.slot_id = s.id and r.status = 'active'
        and tstzrange(r.starts_at, r.ends_at) && tstzrange(now(), v_end)
    )
  order by length(s.label), s.label
  limit 1
  for update skip locked;

  if v_slot is null then raise exception 'No free spots left in this zone'; end if;

  insert into public.parking_reservations (user_id, slot_id, starts_at, ends_at, amount, payment_method)
  values (auth.uid(), v_slot, now(), v_end, v_lot.price, p_method)
  returning * into v_res;
  return v_res;
exception when exclusion_violation then
  raise exception 'You already have a parking reservation for today';
end $$;

-- "Tell me when a spot frees up"
create table public.spot_alerts (
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  lot_id     uuid not null references public.parking_lots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lot_id)
);

-- The student's car (shown on the profile once they have a reservation)
create table public.user_cars (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  plate   text not null,
  model   text,
  color   text
);

-- ---------------------------------------------------------------------
-- 7. EVENTS & CLUBS
-- ---------------------------------------------------------------------
alter table public.clubs rename column name        to name_en;
alter table public.clubs rename column description to description_en;
alter table public.clubs
  add column slug           text unique,
  add column name_ar        text,
  add column description_ar text,
  add column sort_order     int not null default 0;

alter table public.events rename column title       to title_en;
alter table public.events rename column description to about_en;
alter table public.events rename column location    to venue_en;
alter table public.events
  add column slug             text unique,
  add column title_ar         text,
  add column about_ar         text,
  add column venue_ar         text,
  add column venue_detail_en  text,
  add column venue_detail_ar  text,
  add column host_en          text,        -- university events: "Student Affairs"; club events leave null (club name is used)
  add column host_ar          text,
  add column host_initial     text,
  add column registration_url text,
  add column is_draft         boolean not null default false,
  add column date_set         boolean not null default true;   -- drafts may not have a real date yet
alter table public.events alter column created_by drop not null;  -- seeded events have no creator

-- Drafts are only visible to their organizers
drop policy "events: read" on public.events;
create policy "events: read" on public.events for select to authenticated
  using (
    not is_draft
    or created_by = auth.uid()
    or public.is_admin()
    or (club_id is not null and public.is_club_admin(club_id))
  );

-- ...and nobody can RSVP to something they can't see
drop policy "rsvps: create own" on public.event_rsvps;
create policy "rsvps: create own" on public.event_rsvps for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id and not e.is_draft)
  );

-- Organizers see attendee NAMES (not phone/email) for their events
create view public.event_attendees as
select r.event_id, r.user_id, p.full_name, r.created_at
from public.event_rsvps r
join public.events e   on e.id = r.event_id
join public.profiles p on p.id = r.user_id
where public.is_admin() or (e.club_id is not null and public.is_club_admin(e.club_id));

-- ---------------------------------------------------------------------
-- 8. INSTRUCTORS & SCHEDULES
-- ---------------------------------------------------------------------
alter table public.instructors rename column full_name       to name_en;
alter table public.instructors rename column title           to title_en;
alter table public.instructors rename column office_location to office_en;
alter table public.instructors drop column department;      -- replaced by major_key
alter table public.instructors
  add column slug                text unique,
  add column name_ar             text,
  add column title_ar            text,
  add column office_ar           text,
  add column major_key           text references public.majors(key),
  add column availability_status public.availability_status not null default 'available',
  add column status_note         text not null default '',
  add column sort_order          int  not null default 0;

revoke update on public.instructors from anon, authenticated;
grant  update (name_en, name_ar, title_en, title_ar, email, office_en, office_ar, photo_url,
               major_key, availability_status, status_note)
  on public.instructors to authenticated;

create table public.instructor_courses (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  code          text not null,
  name_en       text not null,
  name_ar       text,
  sort_order    int  not null default 0
);

-- One weekly timetable: classes AND the non-class blocks (prep, office hours, duties, ...)
drop table public.class_schedule;
create table public.schedule_slots (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  slot_type     public.slot_type not null,
  title_en      text not null default '',
  title_ar      text not null default '',
  room_en       text,
  room_ar       text,
  check (end_time > start_time)
);

-- Student's follow (and bell) per instructor
create table public.instructor_prefs (
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  followed      boolean not null default false,
  notify        boolean not null default false,
  primary key (user_id, instructor_id)
);

-- How many students follow each instructor (counts only, no user data)
create view public.instructor_follow_counts as
select instructor_id, count(*) filter (where followed)::int as followers
from public.instructor_prefs
group by instructor_id;

-- Instructor portal: status + note + weekly office hours, saved together
-- p_hours: [{"day_of_week": 0, "start_time": "11:00", "end_time": "12:30"}, ...]
create or replace function public.save_portal(
  p_instructor uuid, p_status public.availability_status, p_note text, p_hours jsonb
) returns void language plpgsql security invoker set search_path = public as $$
begin
  if not (public.is_admin() or public.owns_instructor(p_instructor)) then raise exception 'Not allowed'; end if;
  update public.instructors set availability_status = p_status, status_note = coalesce(p_note, '')
  where id = p_instructor;
  delete from public.office_hours where instructor_id = p_instructor;
  insert into public.office_hours (instructor_id, day_of_week, start_time, end_time)
  select p_instructor, (h->>'day_of_week')::smallint, (h->>'start_time')::time, (h->>'end_time')::time
  from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb)) h;
end $$;

-- Replace the instructor's whole weekly timetable (Edit Schedule)
-- p_slots: [{"day_of_week","start_time","end_time","slot_type","title_en","title_ar","room_en","room_ar"}, ...]
create or replace function public.save_week(p_instructor uuid, p_slots jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not (public.is_admin() or public.owns_instructor(p_instructor)) then raise exception 'Not allowed'; end if;
  delete from public.schedule_slots where instructor_id = p_instructor;
  insert into public.schedule_slots
    (instructor_id, day_of_week, start_time, end_time, slot_type, title_en, title_ar, room_en, room_ar)
  select p_instructor, (s->>'day_of_week')::smallint, (s->>'start_time')::time, (s->>'end_time')::time,
         (s->>'slot_type')::public.slot_type, coalesce(s->>'title_en',''), coalesce(s->>'title_ar',''),
         s->>'room_en', s->>'room_ar'
  from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s;
end $$;

-- ---------------------------------------------------------------------
-- 9. STUDENT AFFAIRS QUEUE (replaces the helpdesk tickets)
-- ---------------------------------------------------------------------
drop table public.ticket_messages;
drop table public.tickets;
drop type  public.ticket_status;

create table public.affairs_services (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique,
  name_en             text not null,
  name_ar             text,
  ticket_prefix       text not null default 'A',
  minutes_per_ticket  int  not null default 5 check (minutes_per_ticket > 0),
  is_active           boolean not null default true,
  sort_order          int  not null default 0
);

create table public.queue_tickets (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references public.affairs_services(id),
  user_id         uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  queue_date      date not null default ((now() at time zone 'Asia/Riyadh')::date),
  seq             int  not null,                       -- 1, 2, 3 ... per service per day; shown as prefix-(100+seq)
  appointment_at  timestamptz,                         -- null = "next available"
  status          public.queue_status not null default 'waiting',
  alert_near      boolean not null default true,
  alert_turn      boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (service_id, queue_date, seq)
);
create index on public.queue_tickets (service_id, queue_date, status);
-- a student has at most one live ticket
create unique index queue_one_active_per_user on public.queue_tickets (user_id) where status in ('waiting','serving');

-- Per-service live status for the Student Affairs screen
create view public.affairs_service_status as
select
  s.id, s.slug, s.name_en, s.name_ar, s.ticket_prefix, s.sort_order,
  coalesce(w.waiting, 0)                                              as waiting,
  coalesce(w.waiting, 0) * s.minutes_per_ticket                       as wait_min,
  s.ticket_prefix || '-' || (100 + coalesce(m.max_seq, 0) + 1)        as next_number
from public.affairs_services s
left join (
  select service_id, count(*)::int as waiting from public.queue_tickets
  where queue_date = (now() at time zone 'Asia/Riyadh')::date and status = 'waiting'
  group by service_id
) w on w.service_id = s.id
left join (
  select service_id, max(seq) as max_seq from public.queue_tickets
  where queue_date = (now() at time zone 'Asia/Riyadh')::date
  group by service_id
) m on m.service_id = s.id
where s.is_active;

-- Take a number. p_slot = null means "next available".
create or replace function public.book_queue_ticket(p_service uuid, p_slot timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_seq   int;
  v_id    uuid;
begin
  if not public.is_member() then raise exception 'Student Affairs tickets are for students and staff'; end if;
  if not exists (select 1 from public.affairs_services where id = p_service and is_active) then
    raise exception 'Unknown service';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_service::text));          -- serialise numbering per service
  select coalesce(max(seq), 0) + 1 into v_seq from public.queue_tickets
  where service_id = p_service and queue_date = v_today;

  insert into public.queue_tickets (service_id, user_id, queue_date, seq, appointment_at)
  values (p_service, auth.uid(), v_today, v_seq, p_slot)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'You already have an active ticket';
end $$;

-- The caller's live ticket, with live position numbers
create or replace function public.my_active_ticket()
returns table (
  id uuid, service_id uuid, service_slug text, number text, status public.queue_status,
  ahead int, wait_min int, at timestamptz, served int, total int, now_serving text,
  alert_near boolean, alert_turn boolean
) language sql stable security definer set search_path = public as $$
  select
    t.id, t.service_id, s.slug, s.ticket_prefix || '-' || (100 + t.seq), t.status,
    a.ahead,
    case when t.appointment_at is not null
         then greatest(0, ceil(extract(epoch from (t.appointment_at - now())) / 60))::int
         else a.ahead * s.minutes_per_ticket end,
    coalesce(t.appointment_at, now() + make_interval(mins => a.ahead * s.minutes_per_ticket)),
    d.served,
    d.served + a.ahead,
    coalesce(
      (select s.ticket_prefix || '-' || (100 + q.seq) from public.queue_tickets q
        where q.service_id = t.service_id and q.queue_date = t.queue_date and q.status = 'serving' limit 1),
      (select s.ticket_prefix || '-' || (100 + q.seq) from public.queue_tickets q
        where q.service_id = t.service_id and q.queue_date = t.queue_date and q.status = 'waiting'
        order by q.seq limit 1),
      '-'
    ),
    t.alert_near, t.alert_turn
  from public.queue_tickets t
  join public.affairs_services s on s.id = t.service_id
  cross join lateral (
    select case when t.appointment_at is not null then 0 else
      (select count(*)::int from public.queue_tickets q
        where q.service_id = t.service_id and q.queue_date = t.queue_date
          and q.status = 'waiting' and q.appointment_at is null and q.seq < t.seq) end as ahead
  ) a
  cross join lateral (
    select count(*)::int as served from public.queue_tickets q
    where q.service_id = t.service_id and q.queue_date = t.queue_date and q.status = 'served'
  ) d
  where t.user_id = auth.uid() and t.status in ('waiting','serving')
  limit 1;
$$;

-- Staff action: finish the current ticket and call the next one
create or replace function public.affairs_call_next(p_service uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_next  public.queue_tickets;
  v_pref  text;
begin
  if not public.is_affairs() then raise exception 'Not allowed'; end if;
  select ticket_prefix into v_pref from public.affairs_services where id = p_service;

  update public.queue_tickets set status = 'served'
  where service_id = p_service and queue_date = v_today and status = 'serving';

  select * into v_next from public.queue_tickets
  where service_id = p_service and queue_date = v_today and status = 'waiting'
  order by seq limit 1 for update skip locked;
  if v_next.id is null then return null; end if;

  update public.queue_tickets set status = 'serving' where id = v_next.id;
  return v_pref || '-' || (100 + v_next.seq);
end $$;

-- ---------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY FOR THE NEW TABLES
-- ---------------------------------------------------------------------
alter table public.majors               enable row level security;
alter table public.favorite_restaurants enable row level security;
alter table public.favorite_orders      enable row level security;
alter table public.spot_alerts          enable row level security;
alter table public.user_cars            enable row level security;
alter table public.instructor_courses   enable row level security;
alter table public.schedule_slots       enable row level security;
alter table public.instructor_prefs     enable row level security;
alter table public.affairs_services     enable row level security;
alter table public.queue_tickets        enable row level security;

create policy "majors: read"  on public.majors for select to authenticated using (true);
create policy "majors: admin" on public.majors for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "fav restaurants: own" on public.favorite_restaurants for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "fav orders: own"      on public.favorite_orders      for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "spot alerts: own"     on public.spot_alerts          for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user cars: own"       on public.user_cars            for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "instructor prefs: own" on public.instructor_prefs    for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "courses: read"  on public.instructor_courses for select to authenticated using (true);
create policy "courses: write" on public.instructor_courses for all    to authenticated
  using (public.is_admin() or public.owns_instructor(instructor_id))
  with check (public.is_admin() or public.owns_instructor(instructor_id));

create policy "slots: read"  on public.schedule_slots for select to authenticated using (true);
create policy "slots: write" on public.schedule_slots for all    to authenticated
  using (public.is_admin() or public.owns_instructor(instructor_id))
  with check (public.is_admin() or public.owns_instructor(instructor_id));

create policy "affairs services: read"  on public.affairs_services for select to authenticated using (true);
create policy "affairs services: admin" on public.affairs_services for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Queue tickets are created only through book_queue_ticket(); owners may toggle alerts or cancel.
revoke insert, update on public.queue_tickets from anon, authenticated;
grant  update (status, alert_near, alert_turn) on public.queue_tickets to authenticated;
create policy "queue: read"   on public.queue_tickets for select to authenticated
  using (user_id = auth.uid() or public.is_affairs());
create policy "queue: update own" on public.queue_tickets for update to authenticated
  using (user_id = auth.uid() and status = 'waiting')
  with check (user_id = auth.uid() and status in ('waiting','cancelled'));

-- ---------------------------------------------------------------------
-- 11. FUNCTION PERMISSIONS: signed-in users only (guests included, the functions check role)
-- ---------------------------------------------------------------------
revoke execute on function
  public.place_order(uuid, jsonb, timestamptz, public.payment_method, text),
  public.reserve_parking(uuid, public.payment_method),
  public.save_portal(uuid, public.availability_status, text, jsonb),
  public.save_week(uuid, jsonb),
  public.book_queue_ticket(uuid, timestamptz),
  public.my_active_ticket(),
  public.affairs_call_next(uuid),
  public.save_shuttle_times(text, text[])
from public, anon;
grant execute on function
  public.place_order(uuid, jsonb, timestamptz, public.payment_method, text),
  public.reserve_parking(uuid, public.payment_method),
  public.save_portal(uuid, public.availability_status, text, jsonb),
  public.save_week(uuid, jsonb),
  public.book_queue_ticket(uuid, timestamptz),
  public.my_active_ticket(),
  public.affairs_call_next(uuid),
  public.save_shuttle_times(text, text[])
to authenticated;

-- ---------------------------------------------------------------------
-- 12. REALTIME
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.queue_tickets;
alter publication supabase_realtime add table public.parking_slots;
alter publication supabase_realtime add table public.parking_lots;
