import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { requestSlideFromLeft } from '@/components/ui/slideFromLeft';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider, useI18n } from '@/i18n';
import { CartProvider } from '@/services/cart';
import { DataProvider } from '@/services/data';
import { SessionProvider, useSession } from '@/services/session';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();
  const { session } = useSession();
  const signedIn = session !== null;
  const router = useRouter();

  // Signing out leaves the app screens (they become unreachable), so go to Login ourselves.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (wasSignedIn.current && !signedIn) {
      requestSlideFromLeft();
      router.replace('/login');
    }
    wasSignedIn.current = signedIn;
  }, [signedIn, router]);

  return (
    // `direction` flips every row/start/end in the tree for Arabic without an app reload.
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundPrimary },
        }}
      >
        {/* Signed in: the login screens are removed from the history, so swiping back (or the Android
            back button) can never return to Login. Signed out: the app screens are not reachable. */}
        <Stack.Protected guard={!signedIn}>
          {/* After logging out Login slides in from the left (see slideFromLeft.ts); no native animation. */}
          <Stack.Screen name="login" options={{ animation: 'none' }} />
          <Stack.Screen name="register" />
          <Stack.Screen name="signup" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          {/* No transition into or out of the tabs: getting back to a home page (the guest Home button,
              Back from a guest service) appears directly, without sliding. */}
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, animation: 'none' }} />
          <Stack.Screen name="guest" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <SessionProvider>
            <CartProvider>
              <ToastProvider>
                <DataProvider>
                  <ThemedStack />
                </DataProvider>
              </ToastProvider>
            </CartProvider>
          </SessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
