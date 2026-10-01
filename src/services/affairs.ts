import { nowMinutes } from './clock';
import { createStore } from './store';

// Figma 10 · Student Affairs and 10.1 · Your Ticket.
type L = { en: string; ar: string };

export type AffairsService = { id: string; name: L; waiting: number; waitMin: number };

export const affairsServices: AffairsService[] = [
  {
    id: 'registration',
    name: { en: 'Registration & Enrollment', ar: 'التسجيل والقبول' },
    waiting: 4,
    waitMin: 20,
  },
  {
    id: 'transcripts',
    name: { en: 'Transcripts & Letters', ar: 'السجلات الأكاديمية والخطابات' },
    waiting: 2,
    waitMin: 8,
  },
  {
    id: 'scholarships',
    name: { en: 'Scholarships & Financial Aid', ar: 'المنح والمساعدات المالية' },
    waiting: 7,
    waitMin: 35,
  },
  { id: 'idcard', name: { en: 'Student ID Card', ar: 'البطاقة الجامعية' }, waiting: 1, waitMin: 5 },
];

/** Bookable later slots besides "Next available" (minutes since midnight). */
export const laterSlots = [12 * 60, 13 * 60, 14 * 60 + 30];

export type Ticket = {
  serviceId: string;
  number: string;
  ahead: number;
  waitMin: number;
  /** Appointment time (minutes since midnight). */
  at: number;
  served: number;
  total: number;
  nowServing: string;
  alertNear: boolean;
  alertTurn: boolean;
};

const BASE = 101;

/** What booking now would give you (shown before booking). */
export function estimate(service: AffairsService, slot: number | 'next') {
  const number = `A-${BASE + service.waiting}`;
  if (slot === 'next') {
    return { number, ahead: service.waiting, waitMin: service.waitMin, at: nowMinutes() + 15 };
  }
  return { number, ahead: 0, waitMin: Math.max(0, slot - nowMinutes()), at: slot };
}

export const ticket = createStore<Ticket | null>(null);

export async function book(service: AffairsService, slot: number | 'next'): Promise<Ticket> {
  const e = estimate(service, slot);
  const served = 7;
  // One person was served while you were booking (Figma: 7 → 6 ahead, ~35 → ~30 min).
  const ahead = Math.max(0, e.ahead - 1);
  const t: Ticket = {
    serviceId: service.id,
    number: e.number,
    ahead,
    waitMin: Math.max(0, e.waitMin - 5),
    at: e.at,
    served,
    total: served + ahead,
    nowServing: `A-${BASE}`,
    alertNear: true,
    alertTurn: true,
  };
  ticket.set(t);
  return t;
}

export function cancelTicket() {
  ticket.set(null);
}
