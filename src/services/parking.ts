import { minutesOfDay, todayAtMinutes } from '@/lib/time';

import { bi, db, fetchAll, live, ok, requireUserId } from './backend';
import { nowMinutes } from './clock';
import { reportError } from './errors';
import { createStore, createToggleSet } from './store';

// Figma 06 · Parking: one paid zone (P) plus four free sensor-monitored zones.
type L = { en: string; ar: string };

export type PaidZone = {
  /** Database uuid (backend only). */
  id?: string;
  /** SAR per day. */
  price: number;
  total: number;
  free: number;
};

export type FreeZone = {
  id: string;
  dbId?: string;
  name: L;
  near: L;
  free: number;
  total: number;
  hint: L;
};

const mockPaidZone: PaidZone = { price: 80, total: 50, free: 18 };

const mockFreeZones: FreeZone[] = [
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

export const paidZoneStore = createStore<PaidZone>(
  live ? { price: 0, total: 0, free: 0 } : mockPaidZone,
);
export const freeZonesStore = createStore<FreeZone[]>(live ? [] : mockFreeZones);
export const usePaidZone = paidZoneStore.useValue;
export const useFreeZones = freeZonesStore.useValue;

export function useFreeZone(id: string | undefined): FreeZone | undefined {
  return freeZonesStore.useValue().find((z) => z.id === id);
}

// ---- Bays: one per sensor in each free zone (N-1 … N-120) -----------------------------------

export type Bay = {
  label: string;
  /** Bay number painted on the ground; bay 1 is next to the entrance. */
  number: number;
  occupied: boolean;
  /** False when the bay is closed off (no sensor reading). */
  active: boolean;
};

const bayNumber = (label: string) => Number(label.split('-').pop()) || 0;

/** Mock bays: `free` of `total` free, spread around the lot like real arrivals. */
function mockZoneBays(z: FreeZone): Bay[] {
  const prefix = z.id[0].toUpperCase();
  const order = Array.from({ length: z.total }, (_, i) => i + 1).sort(
    (a, b) => ((a * 7919) % 104729) - ((b * 7919) % 104729) || a - b,
  );
  const free = new Set(order.slice(0, z.free));
  return Array.from({ length: z.total }, (_, i) => ({
    label: `${prefix}-${i + 1}`,
    number: i + 1,
    occupied: !free.has(i + 1),
    active: true,
  }));
}

/** Bays per free zone (zone slug → bays, sorted by number). Fed by the sensors. */
export const zoneBays = createStore<Record<string, Bay[]>>(
  live ? {} : Object.fromEntries(mockFreeZones.map((z) => [z.id, mockZoneBays(z)])),
);

const noBays: Bay[] = [];
export function useZoneBays(zoneId: string | undefined): Bay[] {
  return zoneBays.useValue()[zoneId ?? ''] ?? noBays;
}

/** The free bay closest to the entrance (lowest number), if any. */
export function nearestFreeBay(bays: Bay[]): Bay | undefined {
  return bays.find((b) => b.active && !b.occupied);
}

/**
 * Mock mode only: while a zone map is open, a car leaves and another arrives every few seconds,
 * the way the real sensors would report it (the zone's free count stays the same).
 */
export function simulateSensors(zoneId: string): () => void {
  if (live) return () => {};
  const timer = setInterval(() => {
    const bays = zoneBays.get()[zoneId];
    if (!bays) return;
    const free = bays.filter((b) => !b.occupied);
    const taken = bays.filter((b) => b.occupied);
    if (!free.length || !taken.length) return;
    const arrive = free[Math.floor(Math.random() * free.length)].number;
    const leave = taken[Math.floor(Math.random() * taken.length)].number;
    zoneBays.set((prev) => ({
      ...prev,
      [zoneId]: bays.map((b) =>
        b.number === arrive
          ? { ...b, occupied: true }
          : b.number === leave
            ? { ...b, occupied: false }
            : b,
      ),
    }));
  }, 5000);
  return () => clearInterval(timer);
}

export type ZoneStatus = 'available' | 'almostFull' | 'full';

export function zoneStatus(z: FreeZone): ZoneStatus {
  if (z.free === 0) return 'full';
  return z.free / z.total < 0.05 ? 'almostFull' : 'available';
}

export type PaymentMethod = 'applePay' | 'mada' | 'stcPay';

export type Reservation = {
  id?: string;
  /** Unique reservation number, e.g. "PK-10001". */
  number?: string;
  slot: string;
  method: PaymentMethod;
  amount: number;
  /** When the student said they'd arrive, in minutes since midnight. */
  arriveAt: number;
  /** They answered "Yes, I'm coming". */
  confirmed?: boolean;
};

let mockReservationSeq = 10001;

/** The student's paid reservation for today (one at a time). */
export const reservation = createStore<Reservation | null>(null);

/**
 * The clock for paid reservations. With a backend it is the real Riyadh time, because the database
 * checks refunds against its own clock; the mock keeps the frozen demo clock like the rest of the app.
 */
export function parkingNow(): number {
  return live ? minutesOfDay(new Date().toISOString()) : nowMinutes();
}

/** True while the parking pass is on screen: it asks the same question itself. */
export const passOnScreen = createStore(false);

/** "Are you still coming?" is asked this many minutes before the arrival time. */
export const CHECK_BEFORE_MIN = 30;
/** A full refund is possible until this many minutes after the arrival time. */
export const REFUND_AFTER_MIN = 30;

/** Arrival times offered at checkout: every half hour from the next one until 11:30 PM. */
export function arrivalSlots(now = parkingNow()): number[] {
  const first = Math.ceil((now + 1) / 30) * 30;
  const slots: number[] = [];
  for (let m = first; m <= 23 * 60 + 30; m += 30) slots.push(m);
  return slots;
}

/** True when the app should ask "Are you still coming?" (unanswered, close to arrival). */
export function needsCheck(r: Reservation | null, now = parkingNow()): r is Reservation {
  return !!r && !r.confirmed && now >= r.arriveAt - CHECK_BEFORE_MIN && canRefund(r, now);
}

/** Cancelling (with a full refund) is still possible. */
export function canRefund(r: Reservation, now = parkingNow()): boolean {
  return now <= r.arriveAt + REFUND_AFTER_MIN;
}

/** "Yes, I'm coming": keeps the spot. */
export function confirmReservation() {
  const r = reservation.get();
  if (!r) return;
  reservation.set({ ...r, confirmed: true });
  if (!live || !r.id) return;
  ok(db().rpc('confirm_parking', { p_reservation: r.id })).catch((e) => {
    reservation.set((cur) => (cur && cur.id === r.id ? { ...cur, confirmed: r.confirmed } : cur));
    reportError(e);
  });
}

/** "Cancel & get refund": the spot is free for others again and the money goes back. */
export async function cancelReservation(): Promise<Reservation | null> {
  const r = reservation.get();
  if (!r) return null;
  if (live && r.id) {
    await ok(db().rpc('cancel_parking', { p_reservation: r.id }));
    reservation.set(null);
    hydrateParking().catch(() => {}); // the zone count goes back up
    return r;
  }
  reservation.set(null);
  paidZoneStore.set((z) => ({ ...z, free: Math.min(z.total, z.free + 1) }));
  return r;
}

export async function reserveSlot(
  method: PaymentMethod,
  arriveAt: number = arrivalSlots()[0] ?? parkingNow(),
): Promise<Reservation> {
  const zone = paidZoneStore.get();
  if (!live) {
    const r = {
      number: `PK-${mockReservationSeq++}`,
      slot: 'P-17',
      method,
      amount: zone.price,
      arriveAt,
    };
    reservation.set(r);
    paidZoneStore.set((z) => ({ ...z, free: Math.max(0, z.free - 1) }));
    return r;
  }
  if (!zone.id) throw new Error('Parking is not available right now');
  // The database picks the spot, so two students can never get the same one.
  const row = await ok<{
    id: string;
    slot_id: string;
    amount: number;
    reservation_number: string;
  }>(
    db().rpc('reserve_parking', {
      p_lot: zone.id,
      p_method: method,
      p_arrive: todayAtMinutes(arriveAt),
    }),
  );
  const slot = await ok<{ label: string }>(
    db().from('parking_slots').select('label').eq('id', row.slot_id).single(),
  );
  const r: Reservation = {
    id: row.id,
    number: row.reservation_number,
    slot: slot.label,
    method,
    amount: Number(row.amount),
    arriveAt,
  };
  reservation.set(r);
  hydrateParking().catch(() => {}); // refresh the free counts
  return r;
}

/** The student's car as one line ("ABC 1234 · Toyota Camry"), shown once they hold a reservation. */
export const myCar = createStore<string | null>(null);

/** Zone slugs the student asked to be alerted about when a spot frees up. */
export const spotAlerts = createToggleSet(
  [],
  live
    ? async (zoneId, on) => {
        const zone = freeZonesStore.get().find((z) => z.id === zoneId);
        if (!zone?.dbId) return;
        const userId = requireUserId();
        const table = db().from('spot_alerts');
        if (on) {
          await ok(
            table.upsert({ user_id: userId, lot_id: zone.dbId }, { onConflict: 'user_id,lot_id' }),
          );
        } else {
          await ok(table.delete().eq('user_id', userId).eq('lot_id', zone.dbId));
        }
      }
    : undefined,
);

type ZoneRow = {
  id: string;
  slug: string | null;
  name_en: string;
  name_ar: string | null;
  near_en: string | null;
  near_ar: string | null;
  kind: 'paid' | 'free';
  price: number | null;
  hint_en: string | null;
  hint_ar: string | null;
  total: number;
  free: number;
};

type ReservationRow = {
  id: string;
  reservation_number: string;
  amount: number;
  payment_method: PaymentMethod | null;
  starts_at: string;
  arrive_at: string | null;
  confirmed_at: string | null;
  parking_slots: { label: string } | null;
};

/** Loads live zone counts, today's reservation and the student's spot alerts. */
export async function hydrateParking() {
  if (!live) return;
  const client = db();
  const userId = requireUserId();
  const [zones, mine, alerts, carRow] = await Promise.all([
    fetchAll<ZoneRow>((a, b) =>
      client.from('parking_zones').select('*').order('sort_order').range(a, b),
    ),
    ok<ReservationRow[]>(
      client
        .from('parking_reservations')
        .select(
          'id, reservation_number, amount, payment_method, starts_at, arrive_at, confirmed_at, parking_slots(label)',
        )
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString())
        .limit(1),
    ),
    ok<{ lot_id: string }[]>(client.from('spot_alerts').select('lot_id').eq('user_id', userId)),
    ok<{ plate: string; model: string | null; color: string | null } | null>(
      client.from('user_cars').select('plate, model, color').eq('user_id', userId).maybeSingle(),
    ),
  ]);
  myCar.set(
    carRow
      ? [carRow.plate, [carRow.model, carRow.color].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(' · ')
      : null,
  );
  const paid = zones.find((z) => z.kind === 'paid');
  paidZoneStore.set(
    paid
      ? { id: paid.id, price: Number(paid.price ?? 0), total: paid.total, free: paid.free }
      : { price: 0, total: 0, free: 0 },
  );
  const free: FreeZone[] = zones
    .filter((z) => z.kind === 'free')
    .map((z) => ({
      id: z.slug ?? z.id,
      dbId: z.id,
      name: bi(z.name_en, z.name_ar),
      near: bi(z.near_en, z.near_ar),
      free: z.free,
      total: z.total,
      hint: bi(z.hint_en, z.hint_ar),
    }));
  freeZonesStore.set(free);
  const slots = free.length
    ? await fetchAll<{ lot_id: string; label: string; is_occupied: boolean; is_active: boolean }>(
        (a, b) =>
          client
            .from('parking_slots')
            .select('lot_id, label, is_occupied, is_active')
            .in(
              'lot_id',
              free.map((z) => z.dbId),
            )
            .order('label')
            .range(a, b),
      )
    : [];
  zoneBays.set(
    Object.fromEntries(
      free.map((z) => [
        z.id,
        slots
          .filter((s) => s.lot_id === z.dbId)
          .map((s) => ({
            label: s.label,
            number: bayNumber(s.label),
            occupied: s.is_occupied,
            active: s.is_active,
          }))
          .sort((a, b) => a.number - b.number),
      ]),
    ),
  );
  spotAlerts.replace(free.filter((z) => alerts.some((a) => a.lot_id === z.dbId)).map((z) => z.id));
  const current = mine[0];
  reservation.set(
    current
      ? {
          id: current.id,
          number: current.reservation_number,
          slot: current.parking_slots?.label ?? '—',
          method: current.payment_method ?? 'mada',
          amount: Number(current.amount),
          arriveAt: minutesOfDay(current.arrive_at ?? current.starts_at),
          confirmed: !!current.confirmed_at || undefined,
        }
      : null,
  );
}
