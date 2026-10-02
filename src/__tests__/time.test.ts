import {
  dayOffsetFromToday,
  fromHhmm,
  minutesOfDay,
  riyadhIso,
  toHhmm,
  todayAtMinutes,
  trimTime,
} from '@/lib/time';

// 2026-10-02 12:00 UTC is 15:00 in Riyadh.
const NOW = new Date('2026-10-02T12:00:00Z');

test('riyadhIso builds the UTC instant for a Riyadh wall-clock time', () => {
  expect(riyadhIso(0, '18:30', NOW)).toBe('2026-10-02T15:30:00.000Z');
  expect(riyadhIso(8, '18:30', NOW)).toBe('2026-10-10T15:30:00.000Z');
});

test('midnight Riyadh is 21:00 UTC the day before', () => {
  expect(riyadhIso(0, '00:00', NOW)).toBe('2026-10-01T21:00:00.000Z');
});

test('dayOffsetFromToday uses the Riyadh date, not the UTC date', () => {
  // 22:00 UTC on the 2nd is already the 3rd in Riyadh
  expect(dayOffsetFromToday('2026-10-02T22:00:00Z', NOW)).toBe(1);
  expect(dayOffsetFromToday('2026-10-02T20:59:00Z', NOW)).toBe(0);
  expect(dayOffsetFromToday('2026-10-10T15:30:00Z', NOW)).toBe(8);
});

test('minutesOfDay / toHhmm / fromHhmm round-trip', () => {
  expect(minutesOfDay('2026-10-02T15:30:00Z')).toBe(18 * 60 + 30);
  expect(toHhmm(705)).toBe('11:45');
  expect(fromHhmm('11:45')).toBe(705);
  expect(toHhmm(fromHhmm('07:05'))).toBe('07:05');
});

test('todayAtMinutes and trimTime', () => {
  expect(todayAtMinutes(11 * 60 + 45, NOW)).toBe('2026-10-02T08:45:00.000Z');
  expect(trimTime('08:45:00')).toBe('08:45');
});
