-- =====================================================================
-- Patch 06: a student (or guest) can hold up to 4 live Student Affairs tickets at once,
-- at most one per service. Before, one live ticket per person.
--
--   * the "one live ticket per user" unique index becomes "one live ticket per user per service"
--   * book_queue_ticket() refuses a 5th live ticket
--   * my_active_tickets() (new) returns ALL the caller's live tickets, oldest first.
--     my_active_ticket() is left as it was (returns one) so nothing that calls it breaks.
--
-- Run once in the SQL Editor, AFTER 01-05. Safe to run again.
-- =====================================================================

drop index if exists public.queue_one_active_per_user;
create unique index if not exists queue_one_active_per_user_service
  on public.queue_tickets (user_id, service_id) where status in ('waiting','serving');

create or replace function public.book_queue_ticket(p_service uuid, p_slot timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_seq   int;
  v_id    uuid;
begin
  if auth.uid() is null then raise exception 'You need to be signed in'; end if;
  if not exists (select 1 from public.affairs_services where id = p_service and is_active) then
    raise exception 'Unknown service';
  end if;
  if (select count(*) from public.queue_tickets
      where user_id = auth.uid() and status in ('waiting','serving')) >= 4 then
    raise exception 'You can have up to 4 active tickets';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_service::text));          -- serialise numbering per service
  select coalesce(max(seq), 0) + 1 into v_seq from public.queue_tickets
  where service_id = p_service and queue_date = v_today;

  insert into public.queue_tickets (service_id, user_id, queue_date, seq, appointment_at)
  values (p_service, auth.uid(), v_today, v_seq, p_slot)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'You already have an active ticket for this service';
end $$;

create or replace function public.my_active_tickets()
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
  order by t.created_at;
$$;

revoke execute on function public.my_active_tickets() from public, anon;
grant  execute on function public.my_active_tickets() to authenticated;

-- Make the API see the new function right away (otherwise: "Could not find the function ... in the schema cache").
notify pgrst, 'reload schema';
