// Runs the services in "backend" mode against a fake Supabase client, to check what they send
// and that failed background saves are rolled back. (The SQL itself is tested by `npm run test:db`.)
type Call = { table?: string; rpc?: string; op?: string; args?: unknown };
const mockCalls: Call[] = [];
let mockFail = false;

// A chainable, awaitable stand-in for supabase-js's query mockBuilder.
function mockBuilder(table: string, mockResponses: Record<string, unknown>) {
  const call: Call = { table };
  const result = () =>
    mockFail
      ? Promise.resolve({ data: null, error: { message: 'boom' } })
      : Promise.resolve({ data: mockResponses[table] ?? [], error: null, count: 0 });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'upsert', 'delete']) {
    b[m] = (args: unknown) => {
      call.op = m;
      call.args = args;
      mockCalls.push(call);
      return b;
    };
  }
  for (const m of ['eq', 'gt', 'order', 'range', 'limit', 'single', 'maybeSingle']) b[m] = () => b;
  b.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => result().then(ok, bad);
  return b;
}

const mockResponses: Record<string, unknown> = {};

jest.mock('@/lib/supabase', () => ({
  isBackendConfigured: true,
  supabase: {
    from: (table: string) => mockBuilder(table, mockResponses),
    rpc: (name: string, args: unknown) => {
      mockCalls.push({ rpc: name, args });
      return Promise.resolve(
        mockFail
          ? { data: null, error: { message: 'boom' } }
          : { data: mockResponses[`rpc:${name}`] ?? null, error: null },
      );
    },
  },
}));

import { authUserId } from '@/services/backend';
import { reportError } from '@/services/errors';
import { events, going, toggleGoing } from '@/services/events';
import { favoriteRestaurants, hydrateFood, placeOrder, restaurantsStore } from '@/services/food';

jest.mock('@/services/errors', () => ({
  ...jest.requireActual('@/services/errors'),
  reportError: jest.fn(),
}));

beforeEach(() => {
  mockCalls.length = 0;
  mockFail = false;
  authUserId.set('user-1');
  jest.mocked(reportError).mockClear();
});

test('starts empty in backend mode (no mock data leaks in)', () => {
  expect(restaurantsStore.get()).toEqual([]);
  expect(events.get()).toEqual([]);
  expect(going.get()).toEqual([]);
});

test('hydrateFood fills the store from the database rows', async () => {
  mockResponses.restaurants = [
    {
      id: 'r1',
      slug: 'kafton',
      name_en: 'Kafton',
      name_ar: 'كفتون',
      prep_min: 12,
      rating: 4.8,
      rating_count: 1200,
      coming_soon: false,
      image_url: null,
      cuisine_en: null,
      cuisine_ar: null,
      location_en: null,
      location_ar: null,
    },
  ];
  mockResponses.menu_items = [];
  mockResponses.favorite_restaurants = [{ restaurant_id: 'r1' }];
  await hydrateFood();
  expect(restaurantsStore.get().map((r) => r.id)).toEqual(['kafton']);
  expect(favoriteRestaurants.get()).toEqual(['kafton']); // uuid mapped back to the slug
});

test('placeOrder sends one atomic RPC with uuids, never prices', async () => {
  restaurantsStore.set([
    {
      id: 'kafton',
      dbId: 'r1',
      name: { en: 'Kafton', ar: 'كفتون' },
      cuisine: { en: '', ar: '' },
      prepMin: 12,
      location: { en: '', ar: '' },
      categories: ['wraps'],
      menu: [
        {
          id: 'k-shawarma',
          dbId: 'm1',
          name: { en: 'Shawarma', ar: '' },
          desc: { en: '', ar: '' },
          price: 18,
          emoji: '🌯',
          bg: '#fff',
          category: 'wraps',
        },
      ],
    },
  ]);
  mockResponses['rpc:place_order'] = {
    order_number: 'UF-10432',
    total: 36,
    pickup_time: '2099-01-01T09:00:00Z',
  };
  const order = await placeOrder({
    restaurantId: 'kafton',
    items: 2,
    total: 36,
    readyAt: 0,
    lines: [{ id: 'k-shawarma', vendorId: 'kafton', name: 'Shawarma', price: 18, qty: 2 }],
    payment: 'cash',
  });
  const rpc = mockCalls.find((c) => c.rpc === 'place_order');
  expect(rpc?.args).toEqual({
    p_restaurant: 'r1',
    p_items: [{ menu_item_id: 'm1', quantity: 2 }],
    p_pickup: null, // "as soon as possible"
    p_payment: 'cash',
    p_notes: null,
  });
  expect(order.id).toBe('UF-10432');
  expect(order.total).toBe(36); // the server's total, not the client's
  expect(order.readyAt).toBe(12 * 60); // 09:00 UTC = 12:00 Riyadh
});

test('a favourite toggles instantly and rolls back (with an error) if saving fails', async () => {
  favoriteRestaurants.replace([]);
  mockFail = true;
  favoriteRestaurants.toggle('kafton');
  expect(favoriteRestaurants.get()).toEqual(['kafton']); // optimistic
  await new Promise((r) => setTimeout(r, 0));
  expect(favoriteRestaurants.get()).toEqual([]); // rolled back
  expect(reportError).toHaveBeenCalledWith({ message: 'boom' });
});

test('an RSVP is written to event_rsvps and rolled back on failure', async () => {
  events.set([
    {
      id: 'devfest',
      dbId: 'e1',
      kind: 'club',
      title: { en: 'x', ar: 'x' },
      host: { en: 'x', ar: 'x' },
      hostInitial: 'G',
      dayOffset: 1,
      start: '18:00',
      end: '20:00',
      venue: { en: '', ar: '' },
      venueDetail: { en: '', ar: '' },
      audience: { en: '', ar: '' },
      about: { en: '', ar: '' },
      goingCount: 0,
    },
  ]);
  // what the database would return when the service refreshes after saving
  mockResponses.clubs = [];
  mockResponses.events = [
    {
      id: 'e1',
      slug: 'devfest',
      club_id: null,
      title_en: 'x',
      title_ar: null,
      about_en: null,
      about_ar: null,
      venue_en: null,
      venue_ar: null,
      venue_detail_en: null,
      venue_detail_ar: null,
      host_en: 'x',
      host_ar: null,
      host_initial: 'G',
      starts_at: '2099-01-01T15:00:00Z',
      ends_at: null,
      capacity: null,
      registration_url: null,
      is_draft: false,
      date_set: true,
      clubs: null,
    },
  ];
  mockResponses.event_rsvp_counts = [{ event_id: 'e1', rsvp_count: 1 }];
  mockResponses.event_rsvps = [{ event_id: 'e1' }];

  toggleGoing('devfest');
  await new Promise((r) => setTimeout(r, 0));
  expect(mockCalls.find((c) => c.table === 'event_rsvps' && c.op === 'insert')?.args).toEqual({
    event_id: 'e1',
    user_id: 'user-1',
  });
  expect(going.get()).toEqual(['devfest']);

  mockFail = true;
  toggleGoing('devfest'); // cancel RSVP, but the save fails
  await new Promise((r) => setTimeout(r, 0));
  expect(going.get()).toEqual(['devfest']); // still going: rolled back
});
