import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { AppText, Screen, TopBar } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { ticket } from '@/services/affairs';
import { reportError } from '@/services/errors';
import { favoriteRestaurants, pastOrders, useRestaurants } from '@/services/food';
import { going } from '@/services/events';
import { live } from '@/services/backend';
import { myCar, reservation } from '@/services/parking';
import { getProfile, useDisplayName, useProfile } from '@/services/profile';
import { favoriteInstructors, majors, type Major } from '@/services/schedules';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';
import { initials } from '@/utils/format';

// Figma 12 · Profile and 12.1 · Profile (car on campus)
export default function Profile() {
  const { t, language, setLanguage, isRTL } = useI18n();
  const { colors, isDark, setPreference } = useTheme();
  const router = useRouter();
  const { session, signOut } = useSession();
  const tk = ticket.useValue();
  const pass = reservation.useValue();
  const goingCount = going.useValue().length;
  const favRestaurants = favoriteRestaurants.useValue();
  const followed = favoriteInstructors.useValue();
  const restaurants = useRestaurants();
  const pastCount = pastOrders.useValue();
  const car = myCar.useValue();
  const profile = useProfile();
  const name = useDisplayName();
  const studentId = profile.studentId.replace('-', '') || '—';
  const major =
    profile.majorKey && profile.majorKey in majors ? majors[profile.majorKey as Major] : null;
  const majorLine =
    major && profile.level
      ? fmt(t.profile.majorLine, { major: major[language], level: profile.level })
      : null;
  const favOrders = restaurants.filter((r) => r.favoriteOrder);

  useFocusEffect(
    useCallback(() => {
      getProfile().catch(reportError);
    }, []),
  );

  const favNames = restaurants
    .filter((r) => favRestaurants.includes(r.id))
    .map((r) => r.name[language])
    .join(language === 'ar' ? '، ' : ', ');

  return (
    <Screen header={<TopBar title={t.profile.title} />} gap={12}>
      <View style={[styles.header, { backgroundColor: colors.inkPrimary }]}>
        <View style={[styles.avatar, { backgroundColor: colors.brandPrimary }]}>
          <AppText size={22} weight="bold" tone="onBrand">
            {initials(name)}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="title" size={18} style={styles.white}>
            {name}
          </AppText>
          <AppText variant="caption" style={{ color: colors.inkOnInkMuted }}>
            {fmt(t.profile.studentIdLine, { id: studentId })}
          </AppText>
          {majorLine && (
            <AppText variant="caption" style={{ color: colors.inkOnInkMuted }}>
              {majorLine}
            </AppText>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/profile/edit')}
          style={styles.edit}
        >
          <AppText variant="caption" weight="semibold" style={styles.white}>
            {t.profile.edit}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.activity}>
        <Activity
          icon="ticket"
          value={tk?.number ?? '—'}
          label={t.profile.queueTicket}
          onPress={() => router.navigate(tk ? '/home/affairs/ticket' : '/home/affairs')}
        />
        <Activity
          icon="parking"
          value={pass?.slot ?? '—'}
          label={t.profile.parkingPass}
          onPress={() => router.navigate(pass ? '/parking/reserved' : '/parking')}
        />
        <Activity
          icon="calendar"
          value={String(goingCount)}
          label={t.profile.eventsGoing}
          onPress={() => router.navigate('/home/events')}
        />
        <Activity
          icon="food"
          value={String(pastCount)}
          label={t.profile.pastOrders}
          onPress={() => router.navigate('/food')}
        />
      </View>

      {pass && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/parking/reserved')}
          style={[
            styles.car,
            { backgroundColor: 'rgba(246,137,56,0.1)', borderColor: colors.brandPrimary },
          ]}
        >
          <View style={[styles.carIcon, { backgroundColor: colors.brandPrimary }]}>
            <Icon name="car" color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <View style={styles.row}>
              <AppText variant="bodySmall" weight="semibold">
                {t.profile.carTitle}
              </AppText>
              <View style={[styles.dot, { backgroundColor: colors.statusSuccess }]} />
            </View>
            {(car ?? (live ? null : t.profile.car)) && (
              <AppText variant="captionStrong" tone="secondary">
                {car ?? t.profile.car}
              </AppText>
            )}
            <AppText variant="caption" weight="semibold" tone="brand">
              {fmt(t.profile.carStatus, { slot: pass.slot })}
            </AppText>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textSecondary} flipRTL />
        </Pressable>
      )}

      <Section title={t.profile.saved}>
        <Row
          icon="heart"
          label={t.profile.favRestaurants}
          value={favNames || '—'}
          onPress={() => router.navigate('/food')}
        />
        <Row
          icon="repeat"
          label={t.profile.favOrders}
          value={fmt(t.profile.favOrdersCount, { n: favOrders.length })}
          onPress={() => router.navigate(favOrders[0] ? `/food/${favOrders[0].id}` : '/food')}
        />
        <Row
          icon="bellPlus"
          label={t.profile.followedDoctors}
          value={String(followed.length)}
          onPress={() => router.navigate('/home/schedules')}
          last
        />
      </Section>

      <Section title={t.profile.account}>
        <Row icon="card" label={t.profile.payment} value={t.profile.paymentValue} />
        <Row
          icon="bellPlus"
          label={t.profile.notifications}
          value={t.profile.allOn}
          onPress={() => router.navigate('/home/notifications')}
        />
        <View
          style={[
            styles.rowItem,
            { borderBottomColor: colors.borderDefault, borderBottomWidth: 1 },
          ]}
        >
          <Icon name="globe" size={20} color={colors.brandPrimary} />
          <AppText variant="bodySmall" weight="medium" style={styles.flex}>
            {t.profile.language}
          </AppText>
          <View
            style={[
              styles.segment,
              { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
            ]}
          >
            {(['en', 'ar'] as const).map((l) => {
              const on = language === l;
              return (
                <Pressable
                  key={l}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setLanguage(l)}
                  style={[styles.seg, on && { backgroundColor: colors.brandPrimary }]}
                >
                  <AppText variant="caption" weight="semibold" tone={on ? 'onBrand' : 'secondary'}>
                    {l === 'en' ? 'English' : 'العربية'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.rowItem}>
          <AppText size={14}>🌙</AppText>
          <AppText variant="bodySmall" weight="medium" style={styles.flex}>
            {t.profile.darkMode}
          </AppText>
          <Switch
            value={isDark}
            onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
            trackColor={{ true: colors.brandPrimary, false: colors.borderDefault }}
            thumbColor="#FFFFFF"
            accessibilityLabel={t.profile.darkMode}
          />
        </View>
      </Section>

      <Section title={t.profile.support}>
        <Row
          icon="help"
          label={t.profile.help}
          onPress={() => Alert.alert(t.profile.help, t.profile.helpBody)}
        />
        <Row
          icon="shield"
          label={t.profile.privacy}
          onPress={() => Alert.alert(t.profile.privacy, t.profile.privacyBody)}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            signOut(); // the navigation guards bring you back to Login
          }}
          style={styles.rowItem}
        >
          <View style={isRTL && { transform: [{ scaleX: -1 }] }}>
            <Icon name="logout" size={20} color={colors.statusError} />
          </View>
          <AppText variant="bodySmall" weight="medium" tone="error" style={styles.flex}>
            {t.profile.logout}
          </AppText>
        </Pressable>
      </Section>
    </Screen>
  );
}

function Activity(props: { icon: IconName; value: string; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={[styles.act, { backgroundColor: colors.backgroundSurface }]}
    >
      <Icon name={props.icon} size={20} color={colors.brandPrimary} />
      <AppText variant="bodyStrong" weight="bold">
        {props.value}
      </AppText>
      <AppText size={10} weight="medium" tone="secondary" numberOfLines={1}>
        {props.label}
      </AppText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={[styles.group, { borderColor: colors.borderDefault }]}>{children}</View>
    </View>
  );
}

function Row(props: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!props.onPress}
      onPress={props.onPress}
      style={[
        styles.rowItem,
        !props.last && { borderBottomColor: colors.borderDefault, borderBottomWidth: 1 },
      ]}
    >
      <Icon name={props.icon} size={20} color={colors.brandPrimary} />
      <AppText variant="bodySmall" weight="medium" style={styles.flex}>
        {props.label}
      </AppText>
      {props.value && (
        <AppText variant="caption" tone="secondary">
          {props.value}
        </AppText>
      )}
      <Icon name="chevronRight" size={16} color={colors.textSecondary} flipRTL />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  white: { color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 20px -2px rgba(246,137,56,0.38)',
  },
  edit: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activity: { flexDirection: 'row', gap: 8 },
  act: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 14 },
  car: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  carIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  section: { gap: 8, marginTop: 8 },
  sectionTitle: { marginStart: 4 },
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
  },
  segment: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 16, borderWidth: 1 },
  seg: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 13 },
});
