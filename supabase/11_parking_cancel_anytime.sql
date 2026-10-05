-- =====================================================================
-- Patch 11: a paid parking reservation can always be cancelled (the spot is freed at once).
-- Up to 30 minutes after the arrival time it is a full refund, as in patch 10; after that it is
-- cancelled without a refund (refund_amount = 0) instead of being refused.
--
-- Run once in the SQL Editor, AFTER 10. Safe to run again.
-- =====================================================================

create or replace function public.cancel_parking(p_reservation uuid)
returns public.parking_reservations
language plpgsql security definer set search_path = public as $$
declare
  v_res    public.parking_reservations;
  v_refund boolean;
begin
  select * into v_res from public.parking_reservations
  where id = p_reservation and user_id = auth.uid()
  for update;
  if not found or v_res.status <> 'active' then
    raise exception 'This reservation is no longer active';
  end if;
  v_refund := now() <= coalesce(v_res.arrive_at, v_res.starts_at) + interval '30 minutes';
  update public.parking_reservations
  set status        = 'cancelled',
      refunded_at   = case when v_refund then now() end,
      refund_amount = case when v_refund then amount else 0 end
  where id = p_reservation
  returning * into v_res;
  return v_res;
end $$;
