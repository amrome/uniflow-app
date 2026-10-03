import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, shadows, useTheme } from '@/theme';

import { PressableScale } from './PressableScale';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Flat cards (lists, summaries) skip the drop shadow. */
  flat?: boolean;
  /** `surface` = warm grey fill, no border (Figma background/surface). */
  tone?: 'card' | 'surface' | 'brandSoft';
  accessibilityLabel?: string;
};

/** Figma card: surface/card fill, 1px border/default, 20px radius, soft warm shadow. */
export function Card({ children, onPress, style, flat, tone = 'card', accessibilityLabel }: Props) {
  const { colors, isDark } = useTheme();
  const look = {
    card: { backgroundColor: colors.surfaceCard, borderColor: colors.borderDefault },
    surface: { backgroundColor: colors.backgroundSurface, borderColor: 'transparent' },
    brandSoft: { backgroundColor: colors.brandPrimarySoft, borderColor: colors.brandPrimary },
  }[tone];
  const base = [
    styles.card,
    look,
    !flat && tone === 'card' && !isDark && { boxShadow: shadows.card },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={base}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, padding: 16 },
});
