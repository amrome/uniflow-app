-- =====================================================================
-- Patch 10: paid parking reservations get an arrival time and a "still coming?" check.
--
--   * reserve_parking(lot, method, arrive_at)  the student says when they'll arrive (today).
--   * 30 minutes before that the app asks "Are you still coming?":
--       confirm_parking(reservation)  -> yes, keep the spot (confirmed_at is set)
--       cancel_parking(reservation)   -> the spot is free again at once and the money is refunded
--   * A full refund is possible until 30 minutes after the arrival time. After that the
--     reservation can't be cancelled (the student has had the spot).
--   * Payments are simulated in this prototype, so the refund is recorded here (refunded_at,
--     refund_amount). With a real payment provider cancel_parking is where its refund call goes.
--
-- Run once in the SQL Editor, AFTER 01-09. Safe to run again.
-- =====================================================================

alter table public.parking_reservations
  add column if not exists arrive_at     timestamptz,
  add column if not exists confirmed_at  timestamptz,
  add column if not exists refunded_at   timestamptz,
  add column if not exists refund_amount numeric(8,2);

-- The old two-argument version is replaced by one with an optional arrival time.
drop function if exists public.reserve_parking(uuid, public.payment_method);

create or replace function public.reserve_parking(
  p_lot    uuid,
  p_method public.payment_method,
  p_arrive timestamptz default null
) returns public.parking_reservations
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
  if p_arrive is not null and p_arrive >= v_end then
    raise exception 'Pick an arrival time today';
  end if;

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

  insert into public.parking_reservations (user_id, slot_id, starts_at, ends_at, amount, payment_method, arrive_at)
  values (auth.uid(), v_slot, now(), v_end, v_lot.price, p_method, coalesce(p_arrive, now()))
  returning * into v_res;
  return v_res;
exception when exclusion_violation then
  raise exception 'You already have a parking reservation for today';
end $$;

-- "Yes, I'm coming"
create or replace function public.confirm_parking(p_reservation uuid)
returns public.parking_reservations
language plpgsql security definer set search_path = public as $$
declare
  v_res public.parking_reservations;
begin
  update public.parking_reservations
  set confirmed_at = coalesce(confirmed_at, now())
  where id = p_reservation and user_id = auth.uid() and status = 'active'
  returning * into v_res;
  if not found then raise exception 'This reservation is no longer active'; end if;
  return v_res;
end $$;

-- "Cancel & get refund": frees the spot (only active reservations hold one) and refunds in full.
create or replace function public.cancel_parking(p_reservation uuid)
returns public.parking_reservations
language plpgsql security definer set search_path = public as $$
declare
  v_res public.parking_reservations;
begin
  select * into v_res from public.parking_reservations
  where id = p_reservation and user_id = auth.uid()
  for update;
  if not found or v_res.status <> 'active' then
    raise exception 'This reservation is no longer active';
  end if;
  if now() > coalesce(v_res.arrive_at, v_res.starts_at) + interval '30 minutes' then
    raise exception 'It is too late to cancel: refunds end 30 minutes after your arrival time';
  end if;
  update public.parking_reservations
  set status = 'cancelled', refunded_at = now(), refund_amount = amount
  where id = p_reservation
  returning * into v_res;
  return v_res;
end $$;

revoke execute on function public.reserve_parking(uuid, public.payment_method, timestamptz) from public, anon;
revoke execute on function public.confirm_parking(uuid) from public, anon;
revoke execute on function public.cancel_parking(uuid) from public, anon;
grant  execute on function public.reserve_parking(uuid, public.payment_method, timestamptz) to authenticated;
grant  execute on function public.confirm_parking(uuid) to authenticated;
grant  execute on function public.cancel_parking(uuid) to authenticated;
