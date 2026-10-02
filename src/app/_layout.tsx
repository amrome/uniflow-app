import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider, useI18n } from '@/i18n';
import { CartProvider } from '@/services/cart';
import { DataProvider } from '@/services/data';
import { SessionProvider } from '@/services/session';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();
  return (
    // `direction` flips every row/start/end in the tree for Arabic without an app reload.
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundPrimary },
        }}
      />
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
