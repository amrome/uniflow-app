import type { ImageSourcePropType } from 'react-native';

import type { CartLine } from './cart';
import { createToggleSet } from './store';

export const favoriteRestaurants = createToggleSet(['kafton', 'archi']);

// Restaurants + menus from Figma 04 · Food Menu and 04.1 · Kafton Menu. Archi and Tropika menus
// aren't designed in Figma; they follow the same item pattern with plausible campus items.
type L = { en: string; ar: string };

export type MenuCategory =
  'wraps' | 'grills' | 'drinks' | 'desserts' | 'coffee' | 'pastries' | 'juices' | 'bowls';

export type MenuItem = {
  id: string;
  name: L;
  desc: L;
  price: number;
  emoji: string;
  bg: string;
  category: MenuCategory;
  popular?: boolean;
};

export type Restaurant = {
  id: string;
  name: L;
  cuisine: L;
  prepMin: number;
  location: L;
  logo?: ImageSourcePropType;
  rating?: string;
  comingSoon?: boolean;
  categories: MenuCategory[];
  menu: MenuItem[];
  /** "Your favorite order" — item ids with quantities. */
  favoriteOrder?: { lines: [string, number][]; timesOrdered: number };
};

const najd: L = { en: 'Najd Basement', ar: 'قبو نجد' };

export const restaurants: Restaurant[] = [
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

export function getRestaurant(id: string | undefined): Restaurant | undefined {
  return restaurants.find((r) => r.id === id);
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

export type PlacedOrder = {
  id: string;
  restaurantId: string;
  items: number;
  total: number;
  readyAt: number;
};

let orderSeq = 10432;
const orders: PlacedOrder[] = [];

export async function placeOrder(input: Omit<PlacedOrder, 'id'>): Promise<PlacedOrder> {
  const order = { ...input, id: `UF-${orderSeq++}` };
  orders.unshift(order);
  return order;
}

export function getOrder(id: string | undefined): PlacedOrder | undefined {
  return orders.find((o) => o.id === id);
}
