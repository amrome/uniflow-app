import { haptic } from '@/lib/haptics';
import { minutesOfDay } from '@/lib/time';
import { mockProfile } from '@/mocks/profile';

import { bi, db, live, ok } from './backend';
import { nowMinutes } from './clock';
import { reportError } from './errors';
import {
  findItem,
  getRestaurant,
  mockOrderListeners,
  orderStatuses,
  restaurantsStore,
  type OrderStatus,
  type Restaurant,
} from './food';
import { createStore } from './store';

// Restaurant portal: the iPad at each campus restaurant. It shows the live orders board and lets
// the restaurant mark items sold out, close for a while and set its prep time. The restaurant and
// its menu live in the food store (students see changes at once); orders live here.
type L = { en: string; ar: string };

export type PaymentMethod = 'mada' | 'cash' | 'applePay' | 'stcPay';

export type KitchenOrder = {
  /** Database uuid in live mode, the order number in mock mode. */
  id: string;
  /** Order number people read out (UF-10432). */
  number: string;
  /** Restaurant slug. */
  restaurantId: string;
  status: OrderStatus;
  customer: string;
  items: { name: L; emoji: string; qty: number }[];
  total: number;
  /** Minutes since midnight (Riyadh). */
  placedAt: number;
  pickupAt: number;
  payment: PaymentMethod;
  notes?: string;
};

/** What the restaurant can do next with an order (the big button on its card). */
export const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

/** Orders that can still be rejected (cancelled) by the restaurant. */
export const canCancel = (s: OrderStatus) => s === 'pending' || s === 'preparing';

// ---- Mock data (no backend): a busy lunch rush at Kafton around the frozen demo clock ----------

function mockOrder(
  n: number,
  status: OrderStatus,
  customer: string,
  lines: [string, number][],
  placedAgo: number,
  extra: Partial<KitchenOrder> = {},
): KitchenOrder {
  const kafton = getRestaurant('kafton');
  const items = lines.flatMap(([id, qty]) => {
    const item = kafton && findItem(kafton, id);
    return item ? [{ name: item.name, emoji: item.emoji, qty }] : [];
  });
  const total = lines.reduce((sum, [id, qty]) => {
    const item = kafton && findItem(kafton, id);
    return sum + (item?.price ?? 0) * qty;
  }, 0);
  const placedAt = nowMinutes() - placedAgo;
  return {
    id: `UF-${n}`,
    number: `UF-${n}`,
    restaurantId: 'kafton',
    status,
    customer,
    items,
    total,
    placedAt,
    pickupAt: placedAt + 12,
    payment: 'mada',
    ...extra,
  };
}

function mockKitchenOrders(): KitchenOrder[] {
  return [
    mockOrder(10418, 'completed', 'Lama Alharbi', [['k-shawarma', 1], ['k-laban', 1]], 95),
    mockOrder(10421, 'completed', 'Faisal Alqahtani', [['k-grill', 1]], 70),
    mockOrder(10424, 'completed', 'Nora Alsaud', [['k-falafel', 2], ['k-laban', 2]], 48),
    mockOrder(10426, 'ready', 'Omar Aldosari', [['k-shawarma', 2]], 19),
    mockOrder(10427, 'preparing', 'Reem Almutairi', [['k-grill', 1], ['k-kunafa', 1]], 11, {
      notes: 'No onions please',
    }),
    mockOrder(10428, 'preparing', 'Khalid Alshehri', [['k-falafel', 1]], 7, { payment: 'cash' }),
    mockOrder(10429, 'pending', 'Sara Alanazi', [['k-shawarma', 1], ['k-kunafa', 2]], 3),
    mockOrder(10430, 'pending', 'Yousef Alghamdi', [['k-grill', 2], ['k-laban', 2]], 1, {
      payment: 'applePay',
    }),
  ];
}

/** Today's orders for the restaurant on this device (all restaurants' orders in mock mode). */
export const kitchenOrders = createStore<KitchenOrder[]>(live ? [] : mockKitchenOrders());
export const useKitchenOrders = kitchenOrders.useValue;

// Mock mode: an order placed in the student app on this device shows up on the board.
mockOrderListeners.add((order, lines) => {
  const r = getRestaurant(order.restaurantId);
  kitchenOrders.set((prev) => [
    ...prev,
    {
      id: order.id,
      number: order.id,
      restaurantId: order.restaurantId,
      status: 'pending',
      customer: mockProfile.fullName,
      items: lines.map((l) => {
        const item = r && findItem(r, l.id);
        return {
          name: item?.name ?? { en: l.name, ar: l.name },
          emoji: item?.emoji ?? '🍽️',
          qty: l.qty,
        };
      }),
      total: order.total,
      placedAt: nowMinutes(),
      pickupAt: order.readyAt,
      payment: 'mada',
    },
  ]);
});

// ---- Supabase ---------------------------------------------------------------------------

type KitchenOrderJson = {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string | null;
  total: number;
  pickup_time: string | null;
  created_at: string;
  payment_method: PaymentMethod;
  notes: string | null;
  items: { name_en: string; name_ar: string | null; emoji: string | null; quantity: number }[];
};

export function mapKitchenOrder(o: KitchenOrderJson, restaurantId: string): KitchenOrder {
  const placedAt = minutesOfDay(o.created_at);
  return {
    id: o.id,
    number: o.order_number,
    restaurantId,
    status: o.status,
    customer: o.customer_name || 'Guest',
    items: o.items.map((i) => ({
      name: bi(i.name_en, i.name_ar),
      emoji: i.emoji ?? '🍽️',
      qty: i.quantity,
    })),
    total: Number(o.total),
    placedAt,
    pickupAt: o.pickup_time ? minutesOfDay(o.pickup_time) : placedAt,
    payment: o.payment_method,
    notes: o.notes ?? undefined,
  };
}

let known: Set<string> | null = null;

/** Loads today's board for the restaurant (slug). Buzzes when a new order has come in. */
export async function hydrateKitchen(restaurantId: string) {
  if (!live) return;
  const client = db();
  const dbId =
    getRestaurant(restaurantId)?.dbId ??
    (
      await ok<{ id: string }>(
        client.from('restaurants').select('id').eq('slug', restaurantId).single(),
      )
    ).id;
  const rows = await ok<KitchenOrderJson[]>(client.rpc('kitchen_orders', { p_restaurant: dbId }));
  const list = rows.map((o) => mapKitchenOrder(o, restaurantId));
  if (known && list.some((o) => o.status === 'pending' && !known!.has(o.id))) haptic.success();
  known = new Set(list.map((o) => o.id));
  kitchenOrders.set(list);
}

export function resetKitchen() {
  known = null;
  kitchenOrders.reset();
}

// ---- Actions (optimistic, rolled back with a toast if the database refuses) ---------------

/** Moves an order to its next step, or cancels it. */
export function setOrderStatus(orderId: string, status: OrderStatus) {
  const before = kitchenOrders.get().find((o) => o.id === orderId);
  if (!before) return;
  const apply = (s: OrderStatus) => {
    kitchenOrders.set((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: s } : o)));
    // Mock mode: the student's confirmation screen on this device follows along.
    if (!live) orderStatuses.set((prev) => ({ ...prev, [before.number]: s }));
  };
  apply(status);
  if (status === 'ready') haptic.success();
  if (!live) return;
  ok(db().rpc('set_order_status', { p_order: orderId, p_status: status })).catch((e) => {
    apply(before.status);
    reportError(e);
  });
}

function patchRestaurant(slug: string, patch: (r: Restaurant) => Restaurant) {
  restaurantsStore.set((prev) => prev.map((r) => (r.id === slug ? patch(r) : r)));
}

/** Sold out on/off for one menu item. Students see it straight away. */
export function setSoldOut(restaurantId: string, itemId: string, soldOut: boolean) {
  const r = getRestaurant(restaurantId);
  const item = r && findItem(r, itemId);
  if (!r || !item) return;
  const apply = (v: boolean) =>
    patchRestaurant(restaurantId, (x) => ({
      ...x,
      menu: x.menu.map((m) => (m.id === itemId ? { ...m, soldOut: v || undefined } : m)),
    }));
  apply(soldOut);
  if (!live || !item.dbId) return;
  ok(db().from('menu_items').update({ is_available: !soldOut }).eq('id', item.dbId)).catch((e) => {
    apply(!soldOut);
    reportError(e);
  });
}

/** Open / closed for orders, and the prep time students are quoted. */
export function updateRestaurant(
  restaurantId: string,
  change: { closed?: boolean; prepMin?: number },
) {
  const r = getRestaurant(restaurantId);
  if (!r) return;
  const before = { closed: r.closed, prepMin: r.prepMin };
  const apply = (v: { closed?: boolean; prepMin?: number }) =>
    patchRestaurant(restaurantId, (x) => ({
      ...x,
      ...('closed' in v ? { closed: v.closed || undefined } : {}),
      ...(v.prepMin !== undefined ? { prepMin: v.prepMin } : {}),
    }));
  apply(change);
  if (!live || !r.dbId) return;
  const row: { is_open?: boolean; prep_min?: number } = {};
  if ('closed' in change) row.is_open = !change.closed;
  if (change.prepMin !== undefined) row.prep_min = change.prepMin;
  ok(db().from('restaurants').update(row).eq('id', r.dbId)).catch((e) => {
    apply(before);
    reportError(e);
  });
}

// ---- Board helpers ----------------------------------------------------------------------

export type KitchenStats = { orders: number; revenue: number; active: number; ready: number };

/** Today's numbers for the header: orders taken, money in, orders still in the kitchen. */
export function kitchenStats(list: KitchenOrder[]): KitchenStats {
  const taken = list.filter((o) => o.status !== 'cancelled');
  return {
    orders: taken.length,
    revenue: taken.reduce((sum, o) => sum + o.total, 0),
    active: list.filter((o) => o.status === 'pending' || o.status === 'preparing').length,
    ready: list.filter((o) => o.status === 'ready').length,
  };
}
