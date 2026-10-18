import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

test('student can open profile and edit profile', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Log In'));
  expect(await screen.findByText(/Hi, Amro/, {}, { timeout: 4000 })).toBeTruthy();
  await user.press((await screen.findAllByRole('tab'))[4]);
  expect(await screen.findByText('Log out')).toBeTruthy();
  fireEvent.press(screen.getByText('Edit'));
  expect(await screen.findByText('Change photo')).toBeTruthy();
  await act(async () => {});
});
