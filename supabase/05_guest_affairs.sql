-- =====================================================================
-- Patch 05: guests (visitors) can use Student Affairs too: book a slot and track the queue.
-- Only the membership check in book_queue_ticket() is removed. Everything else (numbering, one active
-- ticket per user, RLS on queue_tickets) is unchanged. Parking stays for students and staff.
--
-- Run once in the SQL Editor, AFTER 01-04. Safe to run again (create or replace).
-- =====================================================================

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
