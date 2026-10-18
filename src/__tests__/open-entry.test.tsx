import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

// Open entry (EXPO_PUBLIC_SKIP_AUTH=1): Login is one Enter button per portal, no password.
// Set before the app's modules load (renderRouter requires them lazily).
process.env.EXPO_PUBLIC_SKIP_AUTH = '1';

jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

const WAIT = { timeout: 4000 };
jest.setTimeout(20000); // the first render loads every route

test('Enter as Student opens the student Home without a password', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  expect(screen.queryByPlaceholderText('••••••••••')).toBeNull();
  await userEvent.setup().press(await screen.findByText('Enter as Student'));
  expect(await screen.findByText(/Hi, Amro/, {}, WAIT)).toBeTruthy();
});

test('Enter as Guest opens the guest home', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  await userEvent.setup().press(await screen.findByText('Enter as Guest'));
  expect(await screen.findByText(/Welcome, Guest/, {}, WAIT)).toBeTruthy();
});

test('a staff portal button opens that portal', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  await userEvent.setup().press(await screen.findByText('Instructor'));
  expect(await screen.findByText('Instructor Portal', {}, WAIT)).toBeTruthy();
});
