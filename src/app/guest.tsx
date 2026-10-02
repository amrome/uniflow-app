import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/icons';
import { AppText, Chip, LangToggle, Screen, ServiceTile } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { useDisplayName } from '@/services/profile';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

// Figma 01.1 · Guest Home
export default function GuestHome() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut } = useSession();
  const name = useDisplayName();

  return (
    <Screen gap={20}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Logo size={44} />
          <AppText variant="title" weight="bold" size={18}>
            Uniflow
          </AppText>
        </View>
        <Chip label={t.guestHome.guest} />
      </View>
      <View style={styles.welcomeRow}>
        <View style={styles.flex}>
          <AppText variant="display">
            {name
              ? fmt(t.guestHome.welcomeName, { name: name.split(' ')[0] })
              : t.guestHome.welcome}
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            {t.guestHome.subtitle}
          </AppText>
        </View>
        <LangToggle />
      </View>
      <View style={styles.row}>
        <ServiceTile
          icon="food"
          tone="ink"
          title={t.home.food}
          subtitle={t.guestHome.foodSub}
          onPress={() => router.push('/food')}
        />
        <ServiceTile
          icon="bus"
          tone="ink"
          title={t.home.transport}
          subtitle={t.guestHome.transportSub}
          onPress={() => router.push('/transport')}
        />
      </View>
      <View style={[styles.banner, { backgroundColor: colors.brandPrimary }]}>
        <AppText variant="title" tone="onBrand">
          {t.guestHome.bannerTitle}
        </AppText>
        <AppText variant="label" weight="regular" tone="onBrand">
          {t.guestHome.bannerBody}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            signOut(); // the navigation guards bring you back to Login
          }}
          style={[styles.bannerCta, { backgroundColor: colors.backgroundPrimary }]}
        >
          <AppText variant="bodySmall" weight="semibold" tone="brand">
            {t.guestHome.bannerCta}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  welcomeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  banner: { borderRadius: 18, padding: 20, gap: 12 },
  bannerCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
