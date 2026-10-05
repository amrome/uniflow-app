-- =====================================================================
-- Patch 09: every free parking zone gets its own numbered bays (N-1 … N-120), one per sensor.
--
--   * Each free zone (North, West, East, South) gets `capacity` rows in parking_slots. Labels are
--     the zone's first letter + the bay number. The seed marks `free_count` of them as free so the
--     numbers match what students already saw.
--   * From now on the sensors write parking_slots.is_occupied (service role key), and a trigger
--     keeps the zone's capacity / free_count in step. The Parking screen and the zone map update
--     live (parking_slots is already in realtime).
--   * Try it in the SQL Editor:  update parking_slots set is_occupied = not is_occupied where label = 'N-7';
--
-- Run once in the SQL Editor, AFTER 01-08. Safe to run again.
-- =====================================================================

-- 1. Bays for the free zones that don't have any yet
insert into public.parking_slots (lot_id, label, is_occupied)
select id, label, rn > free_count
from (
  select l.id,
         l.free_count,
         upper(left(l.slug, 1)) || '-' || n as label,
         -- spread the free bays around the lot instead of putting them all at the start
         row_number() over (partition by l.id order by md5(l.slug || n::text)) as rn
  from public.parking_lots l
  cross join lateral generate_series(1, l.capacity) as n
  where l.kind = 'free'
    and not exists (select 1 from public.parking_slots s where s.lot_id = l.id)
) seeded;

-- 2. A free zone's counts follow its bays
create or replace function public.parking_sync_free_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_lot uuid := coalesce(new.lot_id, old.lot_id);
begin
  update public.parking_lots l
  set capacity   = greatest(1, (select count(*) from public.parking_slots s
                                where s.lot_id = l.id and s.is_active)),
      free_count = (select count(*) from public.parking_slots s
                    where s.lot_id = l.id and s.is_active and not s.is_occupied)
  where l.id = v_lot and l.kind = 'free';
  return null;
end $$;

drop trigger if exists parking_slots_sync_free_count on public.parking_slots;
create trigger parking_slots_sync_free_count
  after insert or update of is_occupied, is_active or delete on public.parking_slots
  for each row execute function public.parking_sync_free_count();
