import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { sortClubs } from '@/services/events';
import { reserveSlot } from '@/services/parking';

jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

// The toast banner animates (reanimated); these tests only care that it was requested.
const mockShow = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  useToast: () => ({ show: mockShow }),
}));

const club = (id: string, en: string, ar: string) => ({ id, name: { en, ar } });

test('clubs are listed A to Z in the language being shown', () => {
  const clubs = [
    club('b', 'Robotics Club', 'نادي الروبوتات'),
    club('a', 'Arts Club', 'نادي الفنون'),
    club('c', 'Chess Club', 'نادي الشطرنج'),
  ];
  expect(sortClubs(clubs, 'en').map((c) => c.id)).toEqual(['a', 'c', 'b']);
  // Arabic order: الروبوتات (ر) < الشطرنج (ش) < الفنون (ف)
  expect(sortClubs(clubs, 'ar').map((c) => c.id)).toEqual(['b', 'c', 'a']);
  expect(clubs.map((c) => c.id)).toEqual(['b', 'a', 'c']); // the original list is untouched
});

test('every parking reservation gets its own number', async () => {
  const first = await reserveSlot('mada');
  const second = await reserveSlot('applePay');
  expect(first.number).toMatch(/^PK-\d+$/);
  expect(second.number).not.toBe(first.number);
});

test('the shuttle and the golf carts each have a Track button that switches to Tracking', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Log In'));
  await user.press((await screen.findAllByRole('tab'))[1]); // Transport

  const buttons = () => screen.getAllByRole('button', { name: /^(Track|Tracking)$/ });
  expect(buttons().map((b) => b.props.accessibilityState.selected)).toEqual([false, false]);

  await user.press(buttons()[0]); // the shuttle
  expect(buttons().map((b) => b.props.accessibilityState.selected)).toEqual([true, false]);

  await user.press(buttons()[1]); // the golf carts
  expect(mockShow).toHaveBeenCalledWith(expect.objectContaining({ emoji: '🛺' }));
  expect(buttons().map((b) => b.props.accessibilityState.selected)).toEqual([true, true]);

  await user.press(buttons()[1]); // tap again to stop
  expect(buttons().map((b) => b.props.accessibilityState.selected)).toEqual([true, false]);
});
