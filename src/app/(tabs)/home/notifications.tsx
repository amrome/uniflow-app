import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { AppText, Card, LangToggle, Screen, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

type Key = 'queue' | 'instructor' | 'shuttle' | 'order' | 'parking' | 'event';

const items: { key: Key; icon: IconName; href: Href; today: boolean; unread: boolean }[] = [
  { key: 'queue', icon: 'ticket', href: '/home/affairs', today: true, unread: true },
  { key: 'instructor', icon: 'clock', href: '/home/schedules/lama', today: true, unread: true },
  { key: 'shuttle', icon: 'bus', href: '/transport', today: true, unread: true },
  { key: 'order', icon: 'food', href: '/food', today: true, unread: false },
  { key: 'parking', icon: 'parking', href: '/parking', today: false, unread: false },
  { key: 'event', icon: 'calendar', href: '/home/events/devfest', today: false, unread: false },
];

// Figma 09 · Notifications
export default function Notifications() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [read, setRead] = useState<Key[]>([]);

  const row = (n: (typeof items)[number]) => {
    const unread = n.unread && !read.includes(n.key);
    const copy = t.notifications.items[n.key];
    return (
      <Card
        key={n.key}
        flat={!unread}
        onPress={() => {
          setRead((r) => [...r, n.key]);
          router.push(n.href);
        }}
        accessibilityLabel={copy.title}
        style={[
          styles.row,
          !unread && { backgroundColor: colors.backgroundPrimary, borderRadius: 16 },
        ]}
      >
        <View
          style={[
            styles.icon,
            {
              backgroundColor: colors.backgroundSurface,
              borderColor: unread ? colors.borderDefault : 'transparent',
            },
          ]}
        >
          <Icon name={n.icon} size={20} color={colors.brandPrimary} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <AppText variant="bodySmall" weight="semibold">
              {copy.title}
            </AppText>
            {unread && <View style={[styles.dot, { backgroundColor: colors.brandPrimary }]} />}
          </View>
          <AppText variant="caption" tone="secondary">
            {copy.body}
          </AppText>
          <AppText variant="tiny" weight="regular" tone="secondary">
            {copy.time}
          </AppText>
        </View>
      </Card>
    );
  };

  return (
    <Screen
      header={
        <TopBar
          title={t.notifications.title}
          right={
            <>
              <LangToggle />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.notifications.markAll}
                hitSlop={8}
                onPress={() => setRead(items.map((i) => i.key))}
              >
                <Icon name="bell" color={colors.textSecondary} />
              </Pressable>
            </>
          }
        />
      }
      gap={10}
    >
      <AppText variant="bodySmall" weight="semibold" tone="secondary">
        {t.notifications.today}
      </AppText>
      {items.filter((i) => i.today).map(row)}
      <AppText variant="bodySmall" weight="semibold" tone="secondary" style={styles.sectionTop}>
        {t.notifications.earlier}
      </AppText>
      {items.filter((i) => !i.today).map(row)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sectionTop: { marginTop: 4 },
});
