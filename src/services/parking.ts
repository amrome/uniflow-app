import { createStore } from './store';

// Figma 06 · Parking: one paid zone (P) plus four free sensor-monitored zones.
type L = { en: string; ar: string };

export const paidZone = { price: 80, total: 50, free: 18 };

export type FreeZone = {
  id: string;
  name: L;
  near: L;
  free: number;
  total: number;
  hint: L;
};

export const freeZones: FreeZone[] = [
  {
    id: 'north',
    name: { en: 'North Parking', ar: 'المواقف الشمالية' },
    near: { en: 'Mahmoud Al-Hamsi St', ar: 'شارع محمود الحمصي' },
    free: 12,
    total: 120,
    hint: { en: 'Usually full by 9:10 AM', ar: 'تمتلئ عادةً بحلول 9:10 ص' },
  },
  {
    id: 'west',
    name: { en: 'West Parking', ar: 'المواقف الغربية' },
    near: { en: 'Engineering & Architecture', ar: 'كلية الهندسة والعمارة' },
    free: 3,
    total: 80,
    hint: { en: 'Usually full by 8:40 AM', ar: 'تمتلئ عادةً بحلول 8:40 ص' },
  },
  {
    id: 'east',
    name: { en: 'East Parking', ar: 'المواقف الشرقية' },
    near: { en: 'Main Building & Mosque', ar: 'المبنى الرئيسي والمسجد' },
    free: 0,
    total: 60,
    hint: {
      en: 'Full since 8:25 AM · frees up ~12:00 PM',
      ar: 'ممتلئة منذ 8:25 ص · تتوفر ~12:00 م',
    },
  },
  {
    id: 'south',
    name: { en: 'South Parking', ar: 'المواقف الجنوبية' },
    near: { en: 'Amin Al-Shibi St · YUPadel', ar: 'شارع أمين الشيبي · YUPadel' },
    free: 8,
    total: 100,
    hint: { en: 'Best arrival: before 9:30 AM', ar: 'أفضل وقت للوصول: قبل 9:30 ص' },
  },
];

export type ZoneStatus = 'available' | 'almostFull' | 'full';

export function zoneStatus(z: FreeZone): ZoneStatus {
  if (z.free === 0) return 'full';
  return z.free / z.total < 0.05 ? 'almostFull' : 'available';
}

export type PaymentMethod = 'applePay' | 'mada' | 'stcPay';

export type Reservation = { slot: string; method: PaymentMethod; amount: number };

/** The student's paid reservation for today (one at a time). */
export const reservation = createStore<Reservation | null>(null);

export async function reserveSlot(method: PaymentMethod): Promise<Reservation> {
  const r = { slot: 'P-17', method, amount: paidZone.price };
  reservation.set(r);
  return r;
}

/** Zone ids the student asked to be alerted about when a spot frees up. */
export const spotAlerts = createStore<readonly string[]>([]);
