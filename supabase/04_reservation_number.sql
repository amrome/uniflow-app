-- =====================================================================
-- Patch 04: a unique, human-friendly number for every parking reservation (PK-10001, PK-10002…),
-- the same idea as food orders (UF-10432…). The database hands the numbers out from a sequence,
-- so two reservations can never share one, even when two students pay at the same moment.
--
-- Run once in the SQL Editor, AFTER 01, 02 and 03. Safe to run again (it skips what exists).
-- =====================================================================

create sequence if not exists public.reservation_number_seq start 10001;
grant usage, select on sequence public.reservation_number_seq to authenticated;

alter table public.parking_reservations
  add column if not exists reservation_number text not null
    default ('PK-' || nextval('public.reservation_number_seq')::text);

create unique index if not exists parking_reservations_number_key
  on public.parking_reservations (reservation_number);
