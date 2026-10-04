import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import { getRestaurant, orderStatuses, placeOrder } from '@/services/food';
import { kitchenOrders, kitchenStats, setOrderStatus, setSoldOut } from '@/services/kitchen';

jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

const WAIT = { timeout: 4000 };
const find = (n: string) => kitchenOrders.get().find((o) => o.number === n);

test('an order from the student app lands on the board and the student sees it get ready', async () => {
  const order = await placeOrder({
    restaurantId: 'kafton',
    items: 2,
    total: 36,
    readyAt: 700,
    lines: [{ id: 'k-shawarma', vendorId: 'kafton', name: 'Chicken Shawarma Wrap', price: 18, qty: 2 }],
  });
  const onBoard = find(order.id);
  expect(onBoard?.status).toBe('pending');
  expect(onBoard?.items).toEqual([
    { name: { en: 'Chicken Shawarma Wrap', ar: 'شاورما دجاج' }, emoji: '🌯', qty: 2 },
  ]);

  setOrderStatus(order.id, 'preparing');
  setOrderStatus(order.id, 'ready');
  expect(orderStatuses.get()[order.id]).toBe('ready'); // the confirmation screen follows along
});

test('sold out and closed reach the student menu', () => {
  setSoldOut('kafton', 'k-kunafa', true);
  expect(getRestaurant('kafton')?.menu.find((m) => m.id === 'k-kunafa')?.soldOut).toBe(true);
  setSoldOut('kafton', 'k-kunafa', false);
  expect(getRestaurant('kafton')?.menu.find((m) => m.id === 'k-kunafa')?.soldOut).toBeUndefined();
});

test("today's numbers leave cancelled orders out", () => {
  const stats = kitchenStats(kitchenOrders.get().filter((o) => o.restaurantId === 'kafton'));
  expect(stats.orders).toBeGreaterThan(0);
  expect(stats.active).toBe(
    kitchenOrders.get().filter((o) => o.status === 'pending' || o.status === 'preparing').length,
  );
});

test('the Restaurant chip opens the orders board and Accept moves an order on', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Staff login'));
  await user.press(await screen.findByText('Restaurant'));
  expect(await screen.findByText('Restaurant Portal', {}, WAIT)).toBeTruthy();
  expect(screen.getByText('Kafton')).toBeTruthy();

  const before = kitchenOrders.get().filter((o) => o.status === 'pending').length;
  await user.press(screen.getAllByRole('button', { name: 'Accept & start' })[0]);
  expect(kitchenOrders.get().filter((o) => o.status === 'pending').length).toBe(before - 1);
  await act(async () => {});
});
