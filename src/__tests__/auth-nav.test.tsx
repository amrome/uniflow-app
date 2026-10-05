import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen, testRouter } from 'expo-router/testing-library';

jest.mock('@expo-google-fonts/inter', () => ({ useFonts: () => [true, null] }));

const WAIT = { timeout: 4000 };

// "When I swipe back it logs me out": after signing in there must be nothing to swipe back to,
// and logging out must return to the login screen.

test('a guest who just signed in cannot go back to the login screen', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Continue as Guest'));
  await user.type(await screen.findByPlaceholderText('5xxxxxxxx'), '555123456');
  await user.type(screen.getByPlaceholderText('Full name'), 'Sara Guest');
  await user.press(screen.getAllByRole('button', { name: 'Continue as Guest' }).slice(-1)[0]);
  expect(await screen.findByText(/Welcome, Sara/, {}, WAIT)).toBeTruthy(); // the guest's name
  expect(testRouter.canGoBack()).toBe(false);
});

test('a guest going back from Food lands on the guest home, never the student app', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Continue as Guest'));
  await user.type(await screen.findByPlaceholderText('5xxxxxxxx'), '555123456');
  await user.type(screen.getByPlaceholderText('Full name'), 'Sara Guest');
  await user.press(screen.getAllByRole('button', { name: 'Continue as Guest' }).slice(-1)[0]);
  await user.press(await screen.findByText('Food Pre-Order', {}, WAIT));
  // the tab bar offers guests their home and the two services, nothing student-only
  expect((await screen.findAllByRole('tab')).map((t) => t.props.accessibilityLabel)).toEqual([
    'Home',
    'Transport',
    'Food',
    'Affairs',
  ]);
  await user.press(await screen.findByRole('button', { name: 'Back' }));
  expect(await screen.findByText(/Welcome, Sara/, {}, WAIT)).toBeTruthy();
  expect(screen.queryByText(/Hi, /)).toBeNull();

  // Student Affairs is open to guests too, and Back returns to the guest home
  await user.press(await screen.findByText('Student Affairs', {}, WAIT));
  expect(await screen.findByText('Book appointment', {}, WAIT)).toBeTruthy();
  await user.press(await screen.findByRole('button', { name: 'Back' }));
  expect(await screen.findByText(/Welcome, Sara/, {}, WAIT)).toBeTruthy();

  // the Home tab brings a guest back from a service too
  await user.press(await screen.findByText('Food Pre-Order', {}, WAIT));
  await user.press(await screen.findByRole('tab', { name: 'Home' }));
  expect(await screen.findByText(/Welcome, Sara/, {}, WAIT)).toBeTruthy();
});

test('a student who just signed in cannot go back, and logging out returns to login', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Log In'));
  expect(await screen.findByText(/Hi, Amro/, {}, WAIT)).toBeTruthy(); // the student's first name
  expect(testRouter.canGoBack()).toBe(false);

  await user.press((await screen.findAllByRole('tab'))[4]);
  await user.press(await screen.findByText('Log out'));
  expect(await screen.findByText('Log In', {}, WAIT)).toBeTruthy();
  expect(screen.queryByText(/Hi, Amro/)).toBeNull();
});

test('a staff member who just signed in cannot go back to the staff login', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  await user.press(await screen.findByText('Staff login'));
  await user.press(await screen.findByText('Instructor'));
  expect(await screen.findByText('Instructor Portal', {}, WAIT)).toBeTruthy();
  expect(testRouter.canGoBack()).toBe(false);
  await act(async () => {});
});

test('the eye button shows and hides the password', async () => {
  await renderRouter('./src/app', { initialUrl: '/login' });
  const user = userEvent.setup();
  const field = await screen.findByPlaceholderText('••••••••••');
  expect(field.props.secureTextEntry).toBe(true);
  await user.press(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByPlaceholderText('••••••••••').props.secureTextEntry).toBe(false);
  await user.press(screen.getByRole('button', { name: 'Hide password' }));
  expect(screen.getByPlaceholderText('••••••••••').props.secureTextEntry).toBe(true);
});
