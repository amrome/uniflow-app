import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import Profile from '@/app/(tabs)/profile/index';
import EditProfile from '@/app/(tabs)/profile/edit';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider } from '@/i18n';
import { SessionProvider } from '@/services/session';
import { ThemeProvider } from '@/theme';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function Wrap({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 900 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>
        <I18nProvider>
          <SessionProvider>
            <ToastProvider>{children}</ToastProvider>
          </SessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

test('profile renders', async () => {
  await renderRouter({
    index: () => (
      <Wrap>
        <Profile />
      </Wrap>
    ),
  });
  expect(await screen.findByText('Log out')).toBeTruthy();
});

test('edit profile renders', async () => {
  await renderRouter({
    index: () => (
      <Wrap>
        <EditProfile />
      </Wrap>
    ),
  });
  expect(await screen.findByText('Edit Profile')).toBeTruthy();
});
