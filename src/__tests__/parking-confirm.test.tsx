import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import {
  arrivalSlots,
  canRefund,
  cancelReservation,
  confirmReservation,
  needsCheck,
  paidZoneStore,
  reservation,
  reserveSlot,
} from '@/services/parking';

jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

// The toast banner animates (reanimated); these tests only care that it was requested.
const mockShow = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  useToast: () => ({ show: mockShow }),
}));

const WAIT = { timeout: 4000 };

// The mock clock is frozen at 11:25 AM.
test('arrival times start at the next half hour', () => {
  expect(arrivalSlots(685).slice(0, 3)).toEqual([690, 720, 750]); // 11:30, 12:00, 12:30
  expect(arrivalSlots(690)[0]).toBe(720); // never "now"
});

test('the question comes 30 minutes before arrival, and a refund is possible until 30 after', async () => {
  const r = await reserveSlot('mada', 720); // 12:00
  expect(needsCheck(r, 685)).toBe(false); // 11:25: too early to ask
  expect(needsCheck(r, 690)).toBe(true); // 11:30
  expect(canRefund(r, 750)).toBe(true); // 12:30
  expect(canRefund(r, 751)).toBe(false);
  confirmReservation();
  expect(needsCheck(reservation.get(), 690)).toBe(false); // answered
  await cancelReservation();
});

test('cancelling gives the spot back to the zone', async () => {
  const free = paidZoneStore.get().free;
  await reserveSlot('applePay', 690);
  expect(paidZoneStore.get().free).toBe(free - 1);
  const cancelled = await cancelReservation();
  expect(cancelled?.amount).toBe(80);
  expect(reservation.get()).toBeNull();
  expect(paidZoneStore.get().free).toBe(free);
});

test('booking a near time asks "still coming?" after leaving the pass; cancel refunds', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Log In'));
  await user.press((await screen.findAllByRole('tab'))[3]); // Parking
  await user.press(await screen.findByText('Reserve a slot'));
  await user.press(await screen.findByRole('button', { name: 'Pay 80 SAR' }));

  // The pass asks itself (no pop-up on top of it)
  expect(await screen.findByText('Please confirm', {}, WAIT)).toBeTruthy();
  expect(screen.queryByText('Are you still coming?')).toBeNull();

  await user.press(screen.getByRole('button', { name: 'Done' }));
  expect(await screen.findByText('Are you still coming?', {}, WAIT)).toBeTruthy();
  const free = paidZoneStore.get().free;
  await user.press(screen.getByText('Cancel & get refund'));
  expect(reservation.get()).toBeNull();
  expect(paidZoneStore.get().free).toBe(free + 1);
  expect(mockShow).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Reservation cancelled',
      body: expect.stringContaining('80 SAR is on its way back'),
    }),
  );
  await act(async () => {});
});

test('a ticket past the refund time can still be cancelled, without a refund', async () => {
  await reserveSlot('mada', 600); // arrival 10:00, now 11:25: more than 30 minutes late
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Log In'));
  await user.press((await screen.findAllByRole('tab'))[3]); // Parking
  await user.press(await screen.findByText(/View your pass/));
  expect(screen.queryByText('Cancel & get refund')).toBeNull();
  await user.press(await screen.findByRole('button', { name: 'Cancel reservation' }));
  await user.press(screen.getAllByText('Cancel reservation').slice(-1)[0]); // confirm in the dialog
  expect(reservation.get()).toBeNull();
  expect(mockShow).toHaveBeenCalledWith(
    expect.objectContaining({ body: expect.stringContaining('No refund') }),
  );
  await act(async () => {});
});
