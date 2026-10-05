import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import { freeZonesStore, nearestFreeBay, simulateSensors, zoneBays } from '@/services/parking';

jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

const WAIT = { timeout: 4000 };
const freeCount = (id: string) => zoneBays.get()[id].filter((b) => !b.occupied).length;

test('every free zone has one numbered bay per space, matching its free count', () => {
  for (const z of freeZonesStore.get()) {
    const bays = zoneBays.get()[z.id];
    expect(bays).toHaveLength(z.total);
    expect(bays.map((b) => b.number)).toEqual(Array.from({ length: z.total }, (_, i) => i + 1));
    expect(freeCount(z.id)).toBe(z.free);
  }
  expect(nearestFreeBay(zoneBays.get().east)).toBeUndefined(); // East is full
  expect(nearestFreeBay(zoneBays.get().north)?.occupied).toBe(false);
});

test('the demo sensors move cars around without changing how many bays are free', () => {
  jest.useFakeTimers();
  const before = zoneBays
    .get()
    .north.map((b) => b.occupied)
    .join();
  const stop = simulateSensors('north');
  jest.advanceTimersByTime(5000);
  expect(
    zoneBays
      .get()
      .north.map((b) => b.occupied)
      .join(),
  ).not.toBe(before);
  expect(freeCount('north')).toBe(12);
  stop();
  jest.useRealTimers();
});

test('tapping a free zone opens its map and tapping a bay shows its number', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Log In'));
  await user.press((await screen.findAllByRole('tab'))[3]); // Parking
  await user.press(await screen.findByRole('button', { name: 'Open map of North Parking' }));
  expect(await screen.findByText('Closest free spot', {}, WAIT)).toBeTruthy();
  expect(screen.getByText('free of 120')).toBeTruthy();

  await user.press(screen.getByRole('button', { name: 'Show me' }));
  const nearest = nearestFreeBay(zoneBays.get().north)!;
  expect(
    screen.getByText(`Bay ${nearest.label} · Row ${Math.ceil(nearest.number / 10)}`),
  ).toBeTruthy();
  await act(async () => {});
});
