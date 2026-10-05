import type { ImageSourcePropType } from 'react-native';

import { minutesOfDay, todayAtMinutes } from '@/lib/time';

import { bi, db, fetchAll, live, ok, requireUserId } from './backend';
import type { CartLine } from './cart';
import { createStore, createToggleSet } from './store';

// Restaurants + menus from Figma 04 · Food Menu and 04.1 · Kafton Menu. Archi and Tropika menus
// aren't designed in Figma; they follow the same item pattern with plausible campus items.
type L = { en: string; ar: string };

export type MenuCategory =
  'wraps' | 'grills' | 'drinks' | 'desserts' | 'coffee' | 'pastries' | 'juices' | 'bowls';

export type MenuItem = {
  id: string;
  /** Database uuid (backend only); `id` is the slug used in routes and the cart. */
  dbId?: string;
  name: L;
  desc: L;
  price: number;
  emoji: string;
  bg: string;
  category: MenuCategory;
  popular?: boolean;
  /** Marked sold out by the restaurant: still listed, but can't be added. */
  soldOut?: boolean;
};

export type Restaurant = {
  id: string;
  dbId?: string;
  name: L;
  cuisine: L;
  prepMin: number;
  location: L;
  logo?: ImageSourcePropType;
  rating?: string;
  comingSoon?: boolean;
  /** Closed for now by the restaurant (Restaurant portal); takes no orders. */
  closed?: boolean;
  categories: MenuCategory[];
  menu: MenuItem[];
  /** "Your favorite order" — item ids with quantities. */
  favoriteOrder?: { lines: [string, number][]; timesOrdered: number };
};

const najd: L = { en: 'Najd Basement', ar: 'قبو نجد' };

const mockRestaurants: Restaurant[] = [
  {
    id: 'kafton',
    name: { en: 'Kafton', ar: 'كفتون' },
    cuisine: { en: 'Saudi · Wraps & grills', ar: 'سعودي · لفائف ومشويات' },
    prepMin: 12,
    location: najd,
    logo: require('../../assets/images/food/kafton.png'),
    rating: '4.8 (1.2k)',
    categories: ['wraps', 'grills', 'drinks', 'desserts'],
    menu: [
      {
        id: 'k-shawarma',
        name: { en: 'Chicken Shawarma Wrap', ar: 'شاورما دجاج' },
        desc: { en: 'Grilled chicken, garlic sauce, pickles', ar: 'دجاج مشوي، ثومية، مخلل' },
        price: 18,
        emoji: '🌯',
        bg: '#FCE5CC',
        category: 'wraps',
        popular: true,
      },
      {
        id: 'k-grill',
        name: { en: 'Mixed Grill Plate', ar: 'صحن مشويات مشكّلة' },
        desc: { en: 'Kebab, shish tawook, rice, salad', ar: 'كباب، شيش طاووق، رز، سلطة' },
        price: 32,
        emoji: '🍖',
        bg: '#FAD9CC',
        category: 'grills',
      },
      {
        id: 'k-falafel',
        name: { en: 'Falafel Wrap', ar: 'لفافة فلافل' },
        desc: { en: 'Tahini, veggies, pickled turnip', ar: 'طحينة، خضار، لفت مخلل' },
        price: 12,
        emoji: '🧆',
        bg: '#E5F0D1',
        category: 'wraps',
      },
      {
        id: 'k-laban',
        name: { en: 'Fresh Laban', ar: 'لبن طازج' },
        desc: { en: 'Chilled yogurt drink', ar: 'مشروب لبن بارد' },
        price: 6,
        emoji: '🥛',
        bg: '#E5EDFA',
        category: 'drinks',
      },
      {
        id: 'k-kunafa',
        name: { en: 'Kunafa Cup', ar: 'كوب كنافة' },
        desc: { en: 'Cheese kunafa, pistachio', ar: 'كنافة بالجبن، فستق' },
        price: 14,
        emoji: '🍮',
        bg: '#FCEFD9',
        category: 'desserts',
      },
    ],
    favoriteOrder: {
      lines: [
        ['k-shawarma', 2],
        ['k-laban', 1],
      ],
      timesOrdered: 8,
    },
  },
  {
    id: 'archi',
    name: { en: 'Archi', ar: 'آرتشي' },
    cuisine: { en: 'Coffee & pastries', ar: 'قهوة ومخبوزات' },
    prepMin: 6,
    location: najd,
    logo: require('../../assets/images/food/archi.png'),
    rating: '4.7 (860)',
    categories: ['coffee', 'pastries'],
    menu: [
      {
        id: 'a-latte',
        name: { en: 'Spanish Latte', ar: 'سبانش لاتيه' },
        desc: { en: 'Double shot, condensed milk', ar: 'شوت مزدوج، حليب مكثف' },
        price: 17,
        emoji: '☕',
        bg: '#F2E2D0',
        category: 'coffee',
        popular: true,
      },
      {
        id: 'a-v60',
        name: { en: 'V60 Pour Over', ar: 'قهوة V60' },
        desc: { en: 'Ethiopian single origin', ar: 'محصول إثيوبي مختص' },
        price: 15,
        emoji: '🫖',
        bg: '#EDE5DA',
        category: 'coffee',
      },
      {
        id: 'a-croissant',
        name: { en: 'Butter Croissant', ar: 'كرواسون بالزبدة' },
        desc: { en: 'Baked fresh every morning', ar: 'يُخبز طازجًا كل صباح' },
        price: 9,
        emoji: '🥐',
        bg: '#FCEBCF',
        category: 'pastries',
      },
      {
        id: 'a-cookie',
        name: { en: 'Date Cookie', ar: 'كوكيز بالتمر' },
        desc: { en: 'Sukkari dates, brown butter', ar: 'تمر سكري، زبدة محمصة' },
        price: 7,
        emoji: '🍪',
        bg: '#F5E3D3',
        category: 'pastries',
      },
    ],
  },
  {
    id: 'tropika',
    name: { en: 'Tropika', ar: 'تروبيكا' },
    cuisine: { en: 'Juices & bowls', ar: 'عصائر وأطباق فواكه' },
    prepMin: 8,
    location: najd,
    logo: require('../../assets/images/food/tropika.jpg'),
    rating: '4.6 (540)',
    categories: ['juices', 'bowls'],
    menu: [
      {
        id: 't-mango',
        name: { en: 'Mango Smoothie', ar: 'سموذي مانجو' },
        desc: { en: 'Mango, banana, yogurt', ar: 'مانجو، موز، زبادي' },
        price: 16,
        emoji: '🥭',
        bg: '#FFE9C7',
        category: 'juices',
        popular: true,
      },
      {
        id: 't-orange',
        name: { en: 'Fresh Orange', ar: 'برتقال طازج' },
        desc: { en: 'Squeezed to order', ar: 'يُعصر عند الطلب' },
        price: 11,
        emoji: '🍊',
        bg: '#FFE2CC',
        category: 'juices',
      },
      {
        id: 't-acai',
        name: { en: 'Açaí Bowl', ar: 'وعاء أساي' },
        desc: { en: 'Granola, berries, honey', ar: 'جرانولا، توت، عسل' },
        price: 24,
        emoji: '🫐',
        bg: '#E8E0F5',
        category: 'bowls',
      },
    ],
  },
  {
    id: 'soon',
    name: { en: 'Coming soon', ar: 'قريبًا' },
    cuisine: { en: 'New spot on campus', ar: 'مطعم جديد في الجامعة' },
    prepMin: 0,
    location: najd,
    comingSoon: true,
    categories: [],
    menu: [],
  },
];

/** Restaurants + menus: the mock above, or what Supabase returned after sign-in. */
export const restaurantsStore = createStore<Restaurant[]>(live ? [] : mockRestaurants);

/** Subscribes the screen to the restaurant list. */
export const useRestaurants = restaurantsStore.useValue;

export function getRestaurant(id: string | undefined): Restaurant | undefined {
  return restaurantsStore.get().find((r) => r.id === id);
}

/** Like getRestaurant, but re-renders the screen when the list loads or changes. */
export function useRestaurant(id: string | undefined): Restaurant | undefined {
  return restaurantsStore.useValue().find((r) => r.id === id);
}

export const favoriteRestaurants = createToggleSet(
  live ? [] : ['kafton', 'archi'],
  live
    ? async (slug, on) => {
        const restaurant = getRestaurant(slug);
        if (!restaurant?.dbId) return;
        const userId = requireUserId();
        const table = db().from('favorite_restaurants');
        if (on) {
          await ok(
            table.upsert(
              { user_id: userId, restaurant_id: restaurant.dbId },
              { onConflict: 'user_id,restaurant_id' },
            ),
          );
        } else {
          await ok(table.delete().eq('user_id', userId).eq('restaurant_id', restaurant.dbId));
        }
      }
    : undefined,
);

/** "Past orders" counter on the profile. */
export const pastOrders = createStore<number>(live ? 0 : 12);

// ---- Supabase mapping -------------------------------------------------------------------

type RestaurantRow = {
  id: string;
  slug: string | null;
  name_en: string;
  name_ar: string | null;
  cuisine_en: string | null;
  cuisine_ar: string | null;
  location_en: string | null;
  location_ar: string | null;
  image_url: string | null;
  prep_min: number;
  rating: number | null;
  rating_count: number;
  coming_soon: boolean;
  is_open: boolean;
};

type MenuRow = {
  id: string;
  restaurant_id: string;
  slug: string | null;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  category: string | null;
  emoji: string | null;
  bg: string | null;
  popular: boolean;
  is_available: boolean;
};

type FavoriteOrderRow = {
  restaurant_id: string;
  lines: { menu_item_id: string; qty: number }[];
  times_ordered: number;
};

// Logos ship inside the app (a restaurant's image_url, when set, wins).
const logos: Record<string, ImageSourcePropType> = {
  kafton: require('../../assets/images/food/kafton.png'),
  archi: require('../../assets/images/food/archi.png'),
  tropika: require('../../assets/images/food/tropika.jpg'),
};

const compactCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

export function mapRestaurant(
  r: RestaurantRow,
  items: MenuRow[],
  favorite?: FavoriteOrderRow,
): Restaurant {
  const menu: MenuItem[] = items.map((m) => ({
    id: m.slug ?? m.id,
    dbId: m.id,
    name: bi(m.name_en, m.name_ar),
    desc: bi(m.description_en, m.description_ar),
    price: Number(m.price),
    emoji: m.emoji ?? '🍽️',
    bg: m.bg ?? '#F2F2F2',
    category: (m.category ?? 'wraps') as MenuCategory,
    popular: m.popular || undefined,
    soldOut: !m.is_available || undefined,
  }));
  const lines: [string, number][] = (favorite?.lines ?? []).flatMap((l) => {
    const item = menu.find((m) => m.dbId === l.menu_item_id);
    return item ? [[item.id, l.qty] as [string, number]] : [];
  });
  return {
    id: r.slug ?? r.id,
    dbId: r.id,
    name: bi(r.name_en, r.name_ar),
    cuisine: bi(r.cuisine_en, r.cuisine_ar),
    prepMin: r.prep_min,
    location: bi(r.location_en, r.location_ar),
    logo: r.image_url ? { uri: r.image_url } : logos[r.slug ?? ''],
    rating: r.rating
      ? `${Number(r.rating).toFixed(1)} (${compactCount(r.rating_count)})`
      : undefined,
    comingSoon: r.coming_soon || undefined,
    closed: !r.is_open || undefined,
    categories: [...new Set(menu.map((m) => m.category))],
    menu,
    favoriteOrder: lines.length ? { lines, timesOrdered: favorite?.times_ordered ?? 1 } : undefined,
  };
}

/** Loads restaurants, menus, favourites and the past-orders count for the signed-in user. */
export async function hydrateFood() {
  if (!live) return;
  const client = db();
  const userId = requireUserId();
  const [rows, menus, favorites, favoriteOrders, past] = await Promise.all([
    fetchAll<RestaurantRow>((a, b) =>
      client.from('restaurants').select('*').order('sort_order').order('name_en').range(a, b),
    ),
    fetchAll<MenuRow>((a, b) =>
      client.from('menu_items').select('*').order('sort_order').range(a, b),
    ),
    ok<{ restaurant_id: string }[]>(
      client.from('favorite_restaurants').select('restaurant_id').eq('user_id', userId),
    ),
    ok<FavoriteOrderRow[]>(
      client
        .from('favorite_orders')
        .select('restaurant_id, lines, times_ordered')
        .eq('user_id', userId),
    ),
    client.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  const list = rows.map((r) =>
    mapRestaurant(
      r,
      menus.filter((m) => m.restaurant_id === r.id),
      favoriteOrders.find((f) => f.restaurant_id === r.id),
    ),
  );
  restaurantsStore.set(list);
  favoriteRestaurants.replace(
    favorites.flatMap((f) => list.filter((r) => r.dbId === f.restaurant_id).map((r) => r.id)),
  );
  pastOrders.set(past.count ?? 0);
}

export function findItem(restaurant: Restaurant, id: string): MenuItem | undefined {
  return restaurant.menu.find((m) => m.id === id);
}

/** Cart lines for a restaurant's saved favourite order. */
export function favoriteLines(r: Restaurant): CartLine[] {
  return (r.favoriteOrder?.lines ?? []).flatMap(([id, qty]) => {
    const item = findItem(r, id);
    return item ? [{ id, vendorId: r.id, name: item.name.en, price: item.price, qty }] : [];
  });
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type PlacedOrder = {
  /** Order number shown to people (UF-10432). */
  id: string;
  /** Database uuid (backend only). */
  dbId?: string;
  restaurantId: string;
  items: number;
  total: number;
  readyAt: number;
};

let orderSeq = 10432;
const orders: PlacedOrder[] = [];

/** Where each of the student's orders is in the kitchen, by order number (kept live). */
export const orderStatuses = createStore<Record<string, OrderStatus>>({});

export function useOrderStatus(orderNumber: string | undefined): OrderStatus {
  return orderStatuses.useValue()[orderNumber ?? ''] ?? 'pending';
}

/**
 * Mock mode only: the Restaurant portal on the same device hears about new orders here, so the
 * demo works without a backend. Live mode gets them from the database instead.
 */
export const mockOrderListeners = new Set<(order: PlacedOrder, lines: CartLine[]) => void>();

/** Re-reads the status of today's orders by this user (the kitchen changed one). */
export async function refreshMyOrders() {
  if (!live) return;
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const rows = await ok<{ order_number: string; status: OrderStatus }[]>(
    db()
      .from('orders')
      .select('order_number, status')
      .eq('user_id', requireUserId())
      .gte('created_at', since),
  );
  orderStatuses.set(Object.fromEntries(rows.map((r) => [r.order_number, r.status])));
}

export type PlaceOrderInput = Omit<PlacedOrder, 'id'> & {
  /** Cart contents (needed to save the order in the backend). */
  lines?: CartLine[];
  payment?: 'mada' | 'cash';
  /** Scheduled pickup, in minutes since midnight; omit for "as soon as possible". */
  scheduledAt?: number;
};

export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  if (!live) {
    const order: PlacedOrder = {
      restaurantId: input.restaurantId,
      items: input.items,
      total: input.total,
      readyAt: input.readyAt,
      id: `UF-${orderSeq++}`,
    };
    orders.unshift(order);
    orderStatuses.set((prev) => ({ ...prev, [order.id]: 'pending' }));
    mockOrderListeners.forEach((l) => l(order, input.lines ?? []));
    return order;
  }
  // One call saves the order and its items; the database prices them from the menu.
  const restaurant = getRestaurant(input.restaurantId);
  if (!restaurant?.dbId) throw new Error('This restaurant is not available');
  const items = (input.lines ?? []).map((l) => ({
    menu_item_id: findItem(restaurant, l.id)?.dbId,
    quantity: l.qty,
  }));
  const row = await ok<{ id: string; order_number: string; total: number; pickup_time: string }>(
    db().rpc('place_order', {
      p_restaurant: restaurant.dbId,
      p_items: items,
      p_pickup: input.scheduledAt === undefined ? null : todayAtMinutes(input.scheduledAt),
      p_payment: input.payment ?? 'mada',
      p_notes: null,
    }),
  );
  const order: PlacedOrder = {
    id: row.order_number,
    dbId: row.id,
    restaurantId: input.restaurantId,
    items: input.items,
    total: Number(row.total),
    readyAt: minutesOfDay(row.pickup_time),
  };
  orders.unshift(order);
  orderStatuses.set((prev) => ({ ...prev, [order.id]: 'pending' }));
  pastOrders.set((n) => n + 1);
  return order;
}

export function getOrder(id: string | undefined): PlacedOrder | undefined {
  return orders.find((o) => o.id === id);
}
