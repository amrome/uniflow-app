import { bi, db, fetchAll, live, ok, requireUserId } from './backend';
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

export type ZoneStatus = 'available' | 'almostFull' | 'full';

export function zoneStatus(z: FreeZone): ZoneStatus {
  if (z.free === 0) return 'full';
  return z.free / z.total < 0.05 ? 'almostFull' : 'available';
}

export type PaymentMethod = 'applePay' | 'mada' | 'stcPay';

export type Reservation = { id?: string; slot: string; method: PaymentMethod; amount: number };

/** The student's paid reservation for today (one at a time). */
export const reservation = createStore<Reservation | null>(null);

export async function reserveSlot(method: PaymentMethod): Promise<Reservation> {
  const zone = paidZoneStore.get();
  if (!live) {
    const r = { slot: 'P-17', method, amount: zone.price };
    reservation.set(r);
    paidZoneStore.set((z) => ({ ...z, free: Math.max(0, z.free - 1) }));
    return r;
  }
  if (!zone.id) throw new Error('Parking is not available right now');
  // The database picks the spot, so two students can never get the same one.
  const row = await ok<{ id: string; slot_id: string; amount: number }>(
    db().rpc('reserve_parking', { p_lot: zone.id, p_method: method }),
  );
  const slot = await ok<{ label: string }>(
    db().from('parking_slots').select('label').eq('id', row.slot_id).single(),
  );
  const r: Reservation = { id: row.id, slot: slot.label, method, amount: Number(row.amount) };
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
  amount: number;
  payment_method: PaymentMethod | null;
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
        .select('id, amount, payment_method, parking_slots(label)')
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
  spotAlerts.replace(free.filter((z) => alerts.some((a) => a.lot_id === z.dbId)).map((z) => z.id));
  const current = mine[0];
  reservation.set(
    current
      ? {
          id: current.id,
          slot: current.parking_slots?.label ?? '—',
          method: current.payment_method ?? 'mada',
          amount: Number(current.amount),
        }
      : null,
  );
}
