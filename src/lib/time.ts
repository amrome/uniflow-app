// Campus time is Riyadh time (UTC+3, no daylight saving). The database stores timestamptz, the
// app thinks in "days from today" + "HH:MM", so these helpers convert between the two without
// depending on the phone's own time zone.
const OFFSET_MIN = 3 * 60;
const DAY_MS = 86_400_000;

function riyadhDayNumber(d: Date): number {
  return Math.floor((d.getTime() + OFFSET_MIN * 60_000) / DAY_MS);
}

/** Whole days between today (Riyadh) and the Riyadh date of `iso`. */
export function dayOffsetFromToday(iso: string, now = new Date()): number {
  return riyadhDayNumber(new Date(iso)) - riyadhDayNumber(now);
}

/** Minutes since Riyadh midnight for an ISO timestamp. */
export function minutesOfDay(iso: string): number {
  const local = new Date(iso).getTime() + OFFSET_MIN * 60_000;
  return Math.floor(local / 60_000) % 1440;
}

/** 705 -> "11:45" */
export function toHhmm(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "11:45" -> 705 */
export function fromHhmm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Postgres `time` comes back as "08:45:00"; the app uses "08:45". */
export function trimTime(t: string): string {
  return t.slice(0, 5);
}

/** ISO timestamp for `hhmm` on the Riyadh day that is `dayOffset` days from today. */
export function riyadhIso(dayOffset: number, hhmm: string, now = new Date()): string {
  const midnight = (riyadhDayNumber(now) + dayOffset) * DAY_MS - OFFSET_MIN * 60_000;
  return new Date(midnight + fromHhmm(hhmm) * 60_000).toISOString();
}

/** ISO timestamp for `minutes` since midnight today (Riyadh). */
export function todayAtMinutes(minutes: number, now = new Date()): string {
  return riyadhIso(0, toHhmm(minutes), now);
}
