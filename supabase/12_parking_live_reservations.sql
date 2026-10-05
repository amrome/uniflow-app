-- =====================================================================
-- Patch 12: paid parking updates live for everyone.
--
--   * parking_reservations is added to realtime, so a student's own phone hears when their
--     reservation is booked, confirmed or cancelled (also from the SQL Editor / dashboard).
--   * Realtime only sends a row to people allowed to read it, and students can't read each other's
--     reservations. So every reservation change also "touches" its parking_lots row: everyone gets
--     that change and re-reads the free count of Zone P.
--
-- Run once in the SQL Editor, AFTER 11. Safe to run again.
-- =====================================================================

do $$
begin
  alter publication supabase_realtime add table public.parking_reservations;
exception when duplicate_object then null;
end $$;

create or replace function public.parking_touch_lot()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.parking_lots l
  set sort_order = l.sort_order          -- no real change; it only sends a realtime event
  from public.parking_slots s
  where s.id = coalesce(new.slot_id, old.slot_id) and l.id = s.lot_id;
  return null;
end $$;

drop trigger if exists parking_reservations_touch_lot on public.parking_reservations;
create trigger parking_reservations_touch_lot
  after insert or update of status or delete on public.parking_reservations
  for each row execute function public.parking_touch_lot();
