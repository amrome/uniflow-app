import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, useTheme } from '@/theme';

import { useInTabs } from './TabStack';

type Props = {
  children: ReactNode;
  /** Fixed header above the scroll area (usually a <TopBar />). */
  header?: ReactNode;
  /** Fixed footer below the scroll area (cart bar, pay button…). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Horizontal padding; Figma uses 20 on most screens and 32 on auth screens. */
  gutter?: number;
  gap?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Base screen: themed background, safe-area padding, optional fixed header/footer. */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  gutter = layout.gutter,
  gap = 16,
  contentStyle,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inTabs = useInTabs();
  const bottom = inTabs || footer ? 24 : insets.bottom + 24;
  const content = [
    { paddingHorizontal: gutter, paddingBottom: bottom, paddingTop: header ? 8 : 6, gap },
    contentStyle,
  ];
  return (
    <View
      style={[styles.root, { backgroundColor: colors.backgroundPrimary, paddingTop: insets.top }]}
    >
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, content]}>{children}</View>
      )}
      {footer && (
        <View
          style={{
            paddingHorizontal: gutter,
            paddingTop: 12,
            paddingBottom: inTabs ? 12 : insets.bottom + 12,
          }}
        >
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, flex: { flex: 1 } });
