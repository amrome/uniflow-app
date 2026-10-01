import { formatTime, nowMinutes, toMinutes } from './clock';
import { createStore } from './store';

export type Direction = 'fromCampus' | 'toCampus';
export type Timetable = Record<Direction, string[]>;

// Shuttle timetable from Figma 11.2 · Shuttle Schedule (Sunday – Thursday, 9 trips each way).
// University admins edit it from 13.5 · Schedule Editor.
export const shuttleTimetable = createStore<Timetable>({
  fromCampus: ['08:45', '09:45', '10:45', '11:45', '13:00', '14:00', '15:00', '16:00', '16:30'],
  toCampus: ['07:45', '08:00', '09:00', '10:00', '11:00', '12:00', '13:30', '14:30', '15:30'],
});

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

export const golfCarts: GolfCart[] = [
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
