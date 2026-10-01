import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { layout, useTheme } from '@/theme';

/** Base screen: themed background, safe-area padding, 24px gutter, RTL-aware direction. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const container = {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    direction: isRTL ? ('rtl' as const) : ('ltr' as const),
  };
  const padding = { paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 24 };
  return scroll ? (
    <ScrollView style={container} contentContainerStyle={[styles.content, padding]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[container, styles.content, padding]}>{children}</View>
  );
}

const styles = StyleSheet.create({ content: { gap: 16, paddingTop: 16 } });
