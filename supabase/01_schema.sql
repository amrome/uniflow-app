-- =====================================================================
-- UniFlow backend schema for Supabase (Postgres)
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Order: enums > tables > helper functions > triggers > grants > RLS
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
create type public.user_role          as enum ('guest','student','staff','instructor','affairs','admin');
create type public.order_status       as enum ('pending','preparing','ready','completed','cancelled');
create type public.reservation_status as enum ('active','cancelled','completed');
create type public.ticket_status      as enum ('open','in_progress','resolved','closed');
create type public.vehicle_type       as enum ('golf_cart','bus');
create type public.club_member_role   as enum ('member','admin');

-- ---------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------

-- Email domain -> role mapping used at sign-up.
-- Fill this in yourself (see the INSERT example at the bottom of this file).
-- Any email whose domain is not listed becomes a 'guest'.
create table public.allowed_domains (
  domain text primary key,
  role   public.user_role not null
);

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  university_id text,
  phone         text,
  avatar_url    text,
  push_token    text,
  role          public.user_role not null default 'guest',
  created_at    timestamptz not null default now()
);

-- Food ordering -------------------------------------------------------
create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image_url   text,
  location    text,
  opens_at    time,
  closes_at   time,
  is_open     boolean not null default true,
  manager_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  category      text,
  price         numeric(8,2) not null check (price >= 0),
  image_url     text,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id),
  status        public.order_status not null default 'pending',
  total         numeric(10,2) not null default 0,   -- maintained by trigger, never set by the app
  pickup_time   timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  quantity     int  not null check (quantity > 0),
  unit_price   numeric(8,2) not null default 0      -- filled by trigger from menu_items.price
);

-- Shuttle -------------------------------------------------------------
create table public.shuttle_routes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text
);

create table public.shuttle_stops (
  id         uuid primary key default gen_random_uuid(),
  route_id   uuid not null references public.shuttle_routes(id) on delete cascade,
  name       text not null,
  lat        double precision not null,
  lng        double precision not null,
  stop_order int not null default 0
);

-- days_of_week: 0 = Sunday ... 6 = Saturday
create table public.shuttle_timetable (
  id             uuid primary key default gen_random_uuid(),
  route_id       uuid not null references public.shuttle_routes(id) on delete cascade,
  stop_id        uuid not null references public.shuttle_stops(id) on delete cascade,
  departure_time time not null,
  days_of_week   smallint[] not null default '{0,1,2,3,4}'
);

-- Live vehicle tracker (golf carts on campus, buses outside) ----------
create table public.vehicles (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  type      public.vehicle_type not null,
  route_id  uuid references public.shuttle_routes(id) on delete set null,
  is_active boolean not null default true
);

create table public.vehicle_locations (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  heading    real,
  speed      real,
  updated_at timestamptz not null default now()
);

-- Parking -------------------------------------------------------------
create table public.parking_lots (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);

create table public.parking_slots (
  id        uuid primary key default gen_random_uuid(),
  lot_id    uuid not null references public.parking_lots(id) on delete cascade,
  label     text not null,
  is_active boolean not null default true,
  unique (lot_id, label)
);

create table public.parking_reservations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  slot_id    uuid not null references public.parking_slots(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  status     public.reservation_status not null default 'active',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- no two active reservations on the same slot may overlap
  constraint parking_no_double_booking
    exclude using gist (slot_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status = 'active'),
  -- a user cannot hold two active slots at the same time
  constraint parking_one_slot_per_user
    exclude using gist (user_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status = 'active')
);

-- Clubs, events, RSVPs ------------------------------------------------
create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role    public.club_member_role not null default 'member',
  primary key (club_id, user_id)
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid references public.clubs(id) on delete set null,
  title       text not null,
  description text,
  location    text,
  image_url   text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  capacity    int check (capacity is null or capacity > 0),
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Instructors, office hours, schedules --------------------------------
create table public.instructors (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid unique references public.profiles(id) on delete set null,
  full_name       text not null,
  title           text,
  department      text,
  email           text,
  office_location text,
  photo_url       text,
  created_at      timestamptz not null default now()
);

create table public.office_hours (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  note          text,
  check (end_time > start_time)
);

create table public.class_schedule (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  course_code   text not null,
  course_name   text,
  section       text,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  room          text,
  check (end_time > start_time)
);

-- Student affairs tickets ---------------------------------------------
create table public.tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category    text,
  subject     text not null,
  description text,
  status      public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  sender_id  uuid not null default auth.uid() references public.profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);

-- Indexes on foreign keys / common filters
create index on public.menu_items (restaurant_id);
create index on public.orders (user_id, created_at desc);
create index on public.orders (restaurant_id, status);
create index on public.order_items (order_id);
create index on public.shuttle_stops (route_id);
create index on public.shuttle_timetable (route_id, departure_time);
create index on public.parking_slots (lot_id);
create index on public.parking_reservations (user_id, starts_at desc);
create index on public.events (starts_at);
create index on public.event_rsvps (user_id);
create index on public.office_hours (instructor_id);
create index on public.class_schedule (instructor_id);
create index on public.tickets (user_id, created_at desc);
create index on public.ticket_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------
-- 3. HELPER FUNCTIONS (SECURITY DEFINER so they bypass RLS safely)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_affairs()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('affairs','admin'));
$$;

-- student / staff / instructor / affairs / admin (everyone except guests)
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role <> 'guest');
$$;

create or replace function public.is_restaurant_manager(p_restaurant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurants where id = p_restaurant and manager_id = auth.uid());
$$;

create or replace function public.is_club_admin(p_club uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_instructor(p_instructor uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.instructors where id = p_instructor and profile_id = auth.uid());
$$;

-- Only admins can change roles (clients cannot update profiles.role directly)
create or replace function public.admin_set_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- Free slots in a lot for a time window, without exposing other users' reservations
create or replace function public.parking_available_slots(p_lot uuid, p_start timestamptz, p_end timestamptz)
returns setof public.parking_slots
language sql stable security definer set search_path = public as $$
  select s.*
  from public.parking_slots s
  where s.lot_id = p_lot
    and s.is_active
    and not exists (
      select 1 from public.parking_reservations r
      where r.slot_id = s.id
        and r.status = 'active'
        and tstzrange(r.starts_at, r.ends_at) && tstzrange(p_start, p_end)
    );
$$;

-- RSVP counts per event, visible to everyone (counts only, no user data)
create view public.event_rsvp_counts as
  select event_id, count(*)::int as rsvp_count
  from public.event_rsvps
  group by event_id;

-- ---------------------------------------------------------------------
-- 4. TRIGGERS
-- ---------------------------------------------------------------------

-- 4a. Create a profile on sign-up; role comes from the email domain
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.allowed_domains
  where lower(domain) = lower(split_part(new.email, '@', 2));

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(v_role, 'guest')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4b. updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at  before update on public.orders  for each row execute function public.set_updated_at();
create trigger tickets_updated_at before update on public.tickets for each row execute function public.set_updated_at();

-- 4c. Order items: price comes from the menu, never from the app
create or replace function public.order_items_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_price      numeric;
  v_rest       uuid;
  v_avail      boolean;
  v_order_rest uuid;
begin
  select price, restaurant_id, is_available into v_price, v_rest, v_avail
  from public.menu_items where id = new.menu_item_id;

  select restaurant_id into v_order_rest from public.orders where id = new.order_id;

  if v_price is null then raise exception 'Unknown menu item'; end if;
  if v_rest is distinct from v_order_rest then raise exception 'Item does not belong to this restaurant'; end if;
  if not v_avail then raise exception 'Item is not available'; end if;

  new.unit_price := v_price;
  return new;
end $$;

create trigger order_items_before_insert
  before insert on public.order_items
  for each row execute function public.order_items_before_insert();

create or replace function public.recalc_order_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
begin
  if tg_op = 'DELETE' then v_order := old.order_id; else v_order := new.order_id; end if;

  update public.orders
  set total = coalesce((select sum(unit_price * quantity) from public.order_items where order_id = v_order), 0)
  where id = v_order;
  return null;
end $$;

create trigger order_items_recalc_total
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_total();

-- 4d. Event capacity (locks the event row so two people can't take the last seat)
create or replace function public.rsvp_capacity_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cap   int;
  v_count int;
begin
  select capacity into v_cap from public.events where id = new.event_id for update;
  if v_cap is not null then
    select count(*) into v_count from public.event_rsvps where event_id = new.event_id;
    if v_count >= v_cap then
      raise exception 'Event is full';
    end if;
  end if;
  return new;
end $$;

create trigger event_rsvps_capacity
  before insert on public.event_rsvps
  for each row execute function public.rsvp_capacity_check();

-- ---------------------------------------------------------------------
-- 5. COLUMN-LEVEL GRANTS (what the app is allowed to UPDATE)
-- ---------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, phone, avatar_url, push_token, university_id) on public.profiles to authenticated;

revoke update on public.orders from anon, authenticated;
grant  update (status, notes, pickup_time) on public.orders to authenticated;

revoke update on public.parking_reservations from anon, authenticated;
grant  update (status) on public.parking_reservations to authenticated;

revoke update on public.tickets from anon, authenticated;
grant  update (status, assigned_to) on public.tickets to authenticated;

revoke update on public.instructors from anon, authenticated;
grant  update (full_name, title, department, email, office_location, photo_url) on public.instructors to authenticated;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.allowed_domains        enable row level security;  -- no policies: only dashboard/service role
alter table public.profiles               enable row level security;
alter table public.restaurants            enable row level security;
alter table public.menu_items             enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.shuttle_routes         enable row level security;
alter table public.shuttle_stops          enable row level security;
alter table public.shuttle_timetable      enable row level security;
alter table public.vehicles               enable row level security;
alter table public.vehicle_locations      enable row level security;
alter table public.parking_lots           enable row level security;
alter table public.parking_slots          enable row level security;
alter table public.parking_reservations   enable row level security;
alter table public.clubs                  enable row level security;
alter table public.club_members           enable row level security;
alter table public.events                 enable row level security;
alter table public.event_rsvps            enable row level security;
alter table public.instructors            enable row level security;
alter table public.office_hours           enable row level security;
alter table public.class_schedule         enable row level security;
alter table public.tickets                enable row level security;
alter table public.ticket_messages        enable row level security;

-- profiles: you see and edit yourself; admins and affairs can read everyone
create policy "profiles: read own"        on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: affairs read"    on public.profiles for select to authenticated using (public.is_affairs());
create policy "profiles: update own"      on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update"    on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- restaurants + menus: everyone signed in can read; admin or the restaurant's manager can write
create policy "restaurants: read"         on public.restaurants for select to authenticated using (true);
create policy "restaurants: admin write"  on public.restaurants for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "restaurants: manager edit" on public.restaurants for update to authenticated using (manager_id = auth.uid()) with check (manager_id = auth.uid());

create policy "menu_items: read"          on public.menu_items for select to authenticated using (true);
create policy "menu_items: write"         on public.menu_items for all    to authenticated
  using (public.is_admin() or public.is_restaurant_manager(restaurant_id))
  with check (public.is_admin() or public.is_restaurant_manager(restaurant_id));

-- orders: owner sees/creates own; can only cancel while pending; managers/admins process them
create policy "orders: read"              on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.is_restaurant_manager(restaurant_id));
create policy "orders: create own"        on public.orders for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "orders: owner cancel"      on public.orders for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status in ('pending','cancelled'));
create policy "orders: staff process"     on public.orders for update to authenticated
  using (public.is_admin() or public.is_restaurant_manager(restaurant_id))
  with check (public.is_admin() or public.is_restaurant_manager(restaurant_id));

-- order_items: visible if the parent order is visible; insertable only into your own pending order
create policy "order_items: read"         on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "order_items: add to own"   on public.order_items for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid() and o.status = 'pending'
  ));

-- shuttle: everyone reads, admins manage
create policy "shuttle_routes: read"      on public.shuttle_routes    for select to authenticated using (true);
create policy "shuttle_routes: admin"     on public.shuttle_routes    for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shuttle_stops: read"       on public.shuttle_stops     for select to authenticated using (true);
create policy "shuttle_stops: admin"      on public.shuttle_stops     for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shuttle_timetable: read"   on public.shuttle_timetable for select to authenticated using (true);
create policy "shuttle_timetable: admin"  on public.shuttle_timetable for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- vehicle tracker: everyone reads; admins write (hardware trackers should use the service role / an Edge Function)
create policy "vehicles: read"            on public.vehicles          for select to authenticated using (true);
create policy "vehicles: admin"           on public.vehicles          for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vehicle_locations: read"   on public.vehicle_locations for select to authenticated using (true);
create policy "vehicle_locations: admin"  on public.vehicle_locations for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- parking: lots/slots readable by all, managed by admins; reservations are private to their owner
create policy "parking_lots: read"        on public.parking_lots  for select to authenticated using (true);
create policy "parking_lots: admin"       on public.parking_lots  for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "parking_slots: read"       on public.parking_slots for select to authenticated using (true);
create policy "parking_slots: admin"      on public.parking_slots for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "reservations: read"        on public.parking_reservations for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "reservations: create own"  on public.parking_reservations for insert to authenticated
  with check (user_id = auth.uid() and status = 'active' and public.is_member());
create policy "reservations: cancel own"  on public.parking_reservations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('active','cancelled'));

-- clubs & membership
create policy "clubs: read"               on public.clubs for select to authenticated using (true);
create policy "clubs: admin"              on public.clubs for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "clubs: club admin edit"    on public.clubs for update to authenticated
  using (public.is_club_admin(id)) with check (public.is_club_admin(id));

create policy "club_members: read"        on public.club_members for select to authenticated
  using (user_id = auth.uid() or public.is_club_admin(club_id) or public.is_admin());
create policy "club_members: join"        on public.club_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member');
create policy "club_members: manage"      on public.club_members for all    to authenticated
  using (public.is_club_admin(club_id) or public.is_admin())
  with check (public.is_club_admin(club_id) or public.is_admin());
create policy "club_members: leave"       on public.club_members for delete to authenticated using (user_id = auth.uid());

-- events: everyone reads; club admins (for their club) and app admins write
create policy "events: read"              on public.events for select to authenticated using (true);
create policy "events: create"            on public.events for insert to authenticated
  with check (created_by = auth.uid() and (public.is_admin() or (club_id is not null and public.is_club_admin(club_id))));
create policy "events: update"            on public.events for update to authenticated
  using (public.is_admin() or (club_id is not null and public.is_club_admin(club_id)))
  with check (public.is_admin() or (club_id is not null and public.is_club_admin(club_id)));
create policy "events: delete"            on public.events for delete to authenticated
  using (public.is_admin() or (club_id is not null and public.is_club_admin(club_id)));

-- RSVPs: you manage your own; organizers can see who is coming
create policy "rsvps: read"               on public.event_rsvps for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.events e where e.id = event_id and e.club_id is not null and public.is_club_admin(e.club_id)
  ));
create policy "rsvps: create own"         on public.event_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy "rsvps: cancel own"         on public.event_rsvps for delete to authenticated using (user_id = auth.uid());

-- instructors: everyone reads; admins manage; an instructor edits their own row, office hours and schedule
create policy "instructors: read"         on public.instructors for select to authenticated using (true);
create policy "instructors: admin"        on public.instructors for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "instructors: edit own"     on public.instructors for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "office_hours: read"        on public.office_hours for select to authenticated using (true);
create policy "office_hours: write"       on public.office_hours for all    to authenticated
  using (public.is_admin() or public.owns_instructor(instructor_id))
  with check (public.is_admin() or public.owns_instructor(instructor_id));

create policy "class_schedule: read"      on public.class_schedule for select to authenticated using (true);
create policy "class_schedule: write"     on public.class_schedule for all    to authenticated
  using (public.is_admin() or public.owns_instructor(instructor_id))
  with check (public.is_admin() or public.owns_instructor(instructor_id));

-- affairs tickets: owner sees own; affairs/admin see and handle all
create policy "tickets: read"             on public.tickets for select to authenticated
  using (user_id = auth.uid() or public.is_affairs());
create policy "tickets: create own"       on public.tickets for insert to authenticated
  with check (user_id = auth.uid() and status = 'open');
create policy "tickets: affairs update"   on public.tickets for update to authenticated
  using (public.is_affairs()) with check (public.is_affairs());

create policy "ticket_messages: read"     on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy "ticket_messages: send"     on public.ticket_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id));

-- ---------------------------------------------------------------------
-- 7. REALTIME (live vehicle map + live order status)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.vehicle_locations;
alter publication supabase_realtime add table public.orders;

-- ---------------------------------------------------------------------
-- 8. AFTER RUNNING: set up your domains and your first admin
-- ---------------------------------------------------------------------
-- Replace the domains with the real university email domains:
--
--   insert into public.allowed_domains (domain, role) values
--     ('students.example.edu.sa', 'student'),
--     ('example.edu.sa',          'staff');
--
-- Make yourself admin (after you sign up once in the app):
--
--   update public.profiles set role = 'admin' where email = 'your-email@example.com';
--   (run it in the SQL editor; the app itself cannot change roles)
