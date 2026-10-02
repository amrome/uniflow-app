import { trimTime } from '@/lib/time';

import { bi, db, fetchAll, live, ok } from './backend';
import { formatTime, nowMinutes, toMinutes } from './clock';
import { createStore } from './store';

export type Direction = 'fromCampus' | 'toCampus';
export type Timetable = Record<Direction, string[]>;

// Shuttle timetable from Figma 11.2 · Shuttle Schedule (Sunday – Thursday, 9 trips each way).
// University admins edit it from 13.5 · Schedule Editor.
const mockTimetable: Timetable = {
  fromCampus: ['08:45', '09:45', '10:45', '11:45', '13:00', '14:00', '15:00', '16:00', '16:30'],
  toCampus: ['07:45', '08:00', '09:00', '10:00', '11:00', '12:00', '13:30', '14:30', '15:30'],
};
export const shuttleTimetable = createStore<Timetable>(
  live ? { fromCampus: [], toCampus: [] } : mockTimetable,
);

/** Saves a new timetable (University Admin > Schedule Editor). */
export async function saveTimetable(table: Timetable) {
  if (live) {
    for (const direction of ['fromCampus', 'toCampus'] as const) {
      await ok(
        db().rpc('save_shuttle_times', { p_direction: direction, p_times: table[direction] }),
      );
    }
  }
  shuttleTimetable.set(table);
}

/** Upcoming departures (minutes since midnight) for a direction, from the demo clock. */
export function upcoming(direction: Direction, table = shuttleTimetable.get()): number[] {
  const now = nowMinutes();
  return table[direction].map(toMinutes).filter((m) => m >= now);
}

/** Index of the next trip in the timetable, or -1 when service has ended. */
export function nextIndex(direction: Direction, table = shuttleTimetable.get()): number {
  const now = nowMinutes();
  return table[direction].findIndex((t) => toMinutes(t) >= now);
}

export function nextShuttleTime(language: 'en' | 'ar' = 'en'): string {
  const [next] = upcoming('fromCampus');
  return next === undefined ? '—' : formatTime(next, language);
}

export type GolfCart = {
  id: string;
  name: { en: string; ar: string };
  near: { en: string; ar: string };
};

const mockGolfCarts: GolfCart[] = [
  {
    id: 'c1',
    name: { en: 'Cart 1', ar: 'عربة 1' },
    near: { en: 'Near Main Building', ar: 'قرب المبنى الرئيسي' },
  },
  {
    id: 'c2',
    name: { en: 'Cart 2', ar: 'عربة 2' },
    near: { en: 'Near College of Engineering', ar: 'قرب كلية الهندسة' },
  },
  {
    id: 'c3',
    name: { en: 'Cart 3', ar: 'عربة 3' },
    near: { en: 'Near YUPadel', ar: 'قرب YUPadel' },
  },
];

export const golfCartsStore = createStore<GolfCart[]>(live ? [] : mockGolfCarts);
export const useGolfCarts = golfCartsStore.useValue;

type TimeRow = { departure_time: string; shuttle_routes: { direction: Direction } | null };
type VehicleRow = {
  id: string;
  slug: string | null;
  name_en: string;
  name_ar: string | null;
  near_en: string | null;
  near_ar: string | null;
};

/** Loads the shuttle timetable and the golf carts. */
export async function hydrateTransport() {
  if (!live) return;
  const client = db();
  const [times, vehicles] = await Promise.all([
    fetchAll<TimeRow>((a, b) =>
      client
        .from('shuttle_timetable')
        .select('departure_time, shuttle_routes(direction)')
        .range(a, b),
    ),
    fetchAll<VehicleRow>((a, b) =>
      client
        .from('vehicles')
        .select('id, slug, name_en, name_ar, near_en, near_ar')
        .eq('type', 'golf_cart')
        .eq('is_active', true)
        .order('sort_order')
        .range(a, b),
    ),
  ]);
  const table: Timetable = { fromCampus: [], toCampus: [] };
  for (const row of times) {
    const direction = row.shuttle_routes?.direction;
    if (direction) table[direction].push(trimTime(row.departure_time));
  }
  table.fromCampus.sort();
  table.toCampus.sort();
  shuttleTimetable.set(table);
  golfCartsStore.set(
    vehicles.map((v) => ({
      id: v.slug ?? v.id,
      name: bi(v.name_en, v.name_ar),
      near: bi(v.near_en, v.near_ar),
    })),
  );
}
