import { minutesOfDay, todayAtMinutes } from '@/lib/time';

import { bi, db, fetchAll, live, ok } from './backend';
import { nowMinutes } from './clock';
import { reportError } from './errors';
import { createStore } from './store';

// Figma 10 · Student Affairs and 10.1 · Your Ticket: a live queue per service.
type L = { en: string; ar: string };

export type AffairsService = {
  id: string;
  /** Database uuid (backend only); `id` is the slug. */
  dbId?: string;
  name: L;
  waiting: number;
  waitMin: number;
  /** The number the next person to book will get (backend only). */
  nextNumber?: string;
};

const mockServices: AffairsService[] = [
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

export const affairsServicesStore = createStore<AffairsService[]>(live ? [] : mockServices);
export const useAffairsServices = affairsServicesStore.useValue;

/** Bookable later slots besides "Next available" (minutes since midnight). */
export const laterSlots = [12 * 60, 13 * 60, 14 * 60 + 30];

export type Ticket = {
  /** Database uuid (backend only). */
  dbId?: string;
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
  const number = service.nextNumber ?? `A-${BASE + service.waiting}`;
  if (slot === 'next') {
    return { number, ahead: service.waiting, waitMin: service.waitMin, at: nowMinutes() + 15 };
  }
  return { number, ahead: 0, waitMin: Math.max(0, slot - nowMinutes()), at: slot };
}

export const ticket = createStore<Ticket | null>(null);

type ServiceRow = {
  id: string;
  slug: string | null;
  name_en: string;
  name_ar: string | null;
  waiting: number;
  wait_min: number;
  next_number: string;
};

type TicketRow = {
  id: string;
  service_slug: string | null;
  service_id: string;
  number: string;
  ahead: number;
  wait_min: number;
  at: string;
  served: number;
  total: number;
  now_serving: string;
  alert_near: boolean;
  alert_turn: boolean;
};

export function mapTicket(r: TicketRow): Ticket {
  return {
    dbId: r.id,
    serviceId: r.service_slug ?? r.service_id,
    number: r.number,
    ahead: r.ahead,
    waitMin: r.wait_min,
    at: minutesOfDay(r.at),
    served: r.served,
    total: Math.max(1, r.total), // the progress bar divides by this
    nowServing: r.now_serving,
    alertNear: r.alert_near,
    alertTurn: r.alert_turn,
  };
}

/** Reloads the student's live ticket (position, now serving…); null when they have none. */
export async function refreshTicket(): Promise<Ticket | null> {
  if (!live) return ticket.get();
  const rows = await ok<TicketRow[]>(db().rpc('my_active_ticket'));
  ticket.set(rows[0] ? mapTicket(rows[0]) : null);
  return ticket.get();
}

/** Loads each service's live waiting count and the student's ticket. */
export async function hydrateAffairs() {
  if (!live) return;
  const rows = await fetchAll<ServiceRow>((a, b) =>
    db().from('affairs_service_status').select('*').order('sort_order').range(a, b),
  );
  affairsServicesStore.set(
    rows.map((r) => ({
      id: r.slug ?? r.id,
      dbId: r.id,
      name: bi(r.name_en, r.name_ar),
      waiting: r.waiting,
      waitMin: r.wait_min,
      nextNumber: r.next_number,
    })),
  );
  await refreshTicket();
}

export async function book(service: AffairsService, slot: number | 'next'): Promise<Ticket> {
  if (live) {
    if (!service.dbId) throw new Error('This service is not available');
    await ok(
      db().rpc('book_queue_ticket', {
        p_service: service.dbId,
        p_slot: slot === 'next' ? null : todayAtMinutes(slot),
      }),
    );
    const booked = await refreshTicket();
    if (!booked) throw new Error('Could not book your ticket');
    hydrateAffairs().catch(() => {}); // the service's waiting count changed
    return booked;
  }
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

/** Turns the "almost your turn" / "it's your turn" alerts on or off. */
export function setTicketAlert(key: 'alertNear' | 'alertTurn', value: boolean) {
  const current = ticket.get();
  if (!current) return;
  ticket.set({ ...current, [key]: value });
  if (!live || !current.dbId) return;
  const column = key === 'alertNear' ? 'alert_near' : 'alert_turn';
  ok(
    db()
      .from('queue_tickets')
      .update({ [column]: value })
      .eq('id', current.dbId),
  ).catch((e) => {
    ticket.set((t) => t && { ...t, [key]: !value });
    reportError(e);
  });
}

export async function cancelTicket() {
  const current = ticket.get();
  if (live && current?.dbId) {
    await ok(db().from('queue_tickets').update({ status: 'cancelled' }).eq('id', current.dbId));
    hydrateAffairs().catch(() => {});
  }
  ticket.set(null);
}
