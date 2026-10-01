import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n';
import { layout, useTheme } from '@/theme';

import { AppText } from './AppText';
import { LangToggle } from './LangToggle';

type Props = {
  title: string;
  /** Hide the back chevron (tab roots). */
  hideBack?: boolean;
  /** Replaces the default trailing actions (language toggle + bell). */
  right?: ReactNode;
  onBack?: () => void;
  /** Figma "BackButton" variant: 36px rounded square on a surface fill (cart, checkout…). */
  boxedBack?: boolean;
};

/** Figma TopBar/Default: back chevron, centred 17px title, trailing actions. */
export function TopBar({ title, hideBack, right, onBack, boxedBack }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {!hideBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            hitSlop={12}
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
            style={boxedBack && [styles.boxed, { backgroundColor: colors.backgroundSurface }]}
          >
            <Icon name="chevronLeft" flipRTL />
          </Pressable>
        )}
      </View>
      <AppText
        variant="title"
        size={boxedBack ? 18 : undefined}
        numberOfLines={1}
        style={styles.title}
        align="center"
      >
        {title}
      </AppText>
      <View style={[styles.side, styles.right]}>{right ?? <DefaultActions />}</View>
    </View>
  );
}

function DefaultActions() {
  return (
    <>
      <LangToggle />
      <BellButton />
    </>
  );
}

export function BellButton() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.notifications.title}
      hitSlop={8}
      onPress={() => router.push('/home/notifications')}
    >
      <Icon name="bell" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: layout.topBarHeight,
    paddingHorizontal: layout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: { width: 96, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end', gap: 10 },
  title: { flex: 1 },
  boxed: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
