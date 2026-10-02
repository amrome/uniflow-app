import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, BellButton, LangToggle, Screen, ServiceTile } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { useDisplayName } from '@/services/profile';
import { nextShuttleTime } from '@/services/transport';
import { gradients, shadows, useTheme } from '@/theme';
import { initials } from '@/utils/format';

// Figma 02 · Home
export default function Home() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const name = useDisplayName();

  return (
    <Screen gap={20}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.profile.title}
          onPress={() => router.push('/profile')}
          style={[styles.avatar, { backgroundColor: colors.inkPrimary }]}
        >
          <AppText variant="label" style={{ color: '#FFFFFF' }}>
            {initials(name) || '👤'}
          </AppText>
        </Pressable>
        <AppText variant="title" weight="bold" size={18}>
          Uniflow
        </AppText>
        <View style={styles.actions}>
          <LangToggle />
          <BellButton />
        </View>
      </View>

      <View style={styles.greeting}>
        <AppText variant="display">
          {name ? fmt(t.home.greeting, { name: name.split(' ')[0] }) : t.home.greetingNoName}
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          {t.home.subtitle}
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/transport')}
        style={{ borderRadius: 16, boxShadow: shadows.banner }}
      >
        <LinearGradient
          colors={gradients.banner}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shuttle}
        >
          <Icon name="bus" color="#FFFFFF" />
          <View style={styles.flex}>
            <AppText variant="bodySmall" weight="semibold" tone="onBrand" numberOfLines={1}>
              {t.home.shuttleTitle}
            </AppText>
            <AppText variant="caption" style={{ color: '#E8E4E0' }} numberOfLines={1}>
              {fmt(t.home.shuttleSub, { time: nextShuttleTime() })}
            </AppText>
          </View>
          <View style={[styles.live, { backgroundColor: colors.brandPrimary }]}>
            <View style={styles.liveDot} />
            <AppText variant="tiny" weight="bold" tone="onBrand">
              {t.home.live}
            </AppText>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.grid}>
        <View style={styles.row}>
          <ServiceTile
            icon="clock"
            tone="brand"
            title={t.home.schedules}
            subtitle={t.home.schedulesSub}
            onPress={() => router.push('/home/schedules')}
          />
          <ServiceTile
            icon="briefcase"
            tone="ink"
            title={t.home.affairs}
            subtitle={t.home.affairsSub}
            onPress={() => router.push('/home/affairs')}
          />
        </View>
        <View style={styles.row}>
          <ServiceTile
            icon="food"
            tone="ink"
            title={t.home.food}
            subtitle={t.home.foodSub}
            onPress={() => router.push('/food')}
          />
          <ServiceTile
            icon="parking"
            tone="brand"
            title={t.home.parking}
            subtitle={t.home.parkingSub}
            onPress={() => router.push('/parking')}
          />
        </View>
        <View style={styles.row}>
          <ServiceTile
            icon="calendar"
            tone="brand"
            title={t.home.events}
            subtitle={t.home.eventsSub}
            onPress={() => router.push('/home/events')}
          />
          <ServiceTile
            icon="cart"
            tone="ink"
            title={t.home.transport}
            subtitle={t.home.transportSub}
            onPress={() => router.push('/transport')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { gap: 4 },
  shuttle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
