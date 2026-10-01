import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Screen, TopBar } from '@/components/ui';
import { CampusMap } from '@/features/transport/CampusMap';
import { fmt, useI18n } from '@/i18n';
import { formatDuration, formatTime, nowMinutes } from '@/services/clock';
import { golfCarts, shuttleTimetable, upcoming, type Direction } from '@/services/transport';
import { useTheme } from '@/theme';

type TrackState = 'idle' | 'tracking' | 'near' | 'arrived';

// Figma 11 · Transportation, 11.1 · To Uni, and the Shuttle Near / Arrived states.
export default function Transportation() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ dir?: string }>();
  const [direction, setDirection] = useState<Direction>(
    params.dir === 'to' ? 'toCampus' : 'fromCampus',
  );
  const [track, setTrack] = useState<TrackState>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Prototype tracking: "near" after a moment, "arrived" a few seconds later.
  const startTracking = () => {
    timers.current.forEach(clearTimeout);
    setTrack('tracking');
    timers.current = [
      setTimeout(() => setTrack('near'), 1500),
      setTimeout(() => setTrack('arrived'), 6000),
    ];
  };

  const table = shuttleTimetable.use();
  const [next, after] = upcoming(direction, table);
  const from = direction === 'fromCampus';
  const until = (m: number | undefined) =>
    m === undefined
      ? ''
      : fmt(t.transport.inTime, { time: formatDuration(m - nowMinutes(), language) });

  return (
    <Screen header={<TopBar title={t.transport.title} />}>
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.transport.title}
          onPress={() => router.push('/transport/map')}
        >
          <CampusMap />
        </Pressable>
        {(track === 'near' || track === 'arrived') && (
          <StatusToast state={track} onClose={() => setTrack('idle')} />
        )}
      </View>

      {track !== 'near' && track !== 'arrived' && (
        <Pressable
          accessibilityRole="button"
          onPress={startTracking}
          disabled={track === 'tracking'}
          style={[styles.track, { backgroundColor: colors.brandPrimary }]}
        >
          <AppText variant="label" tone="onBrand">
            {track === 'tracking' ? t.transport.tracking : t.transport.track}
          </AppText>
        </Pressable>
      )}

      <View style={[styles.shuttle, { backgroundColor: colors.inkPrimary }]}>
        <View style={styles.toggle}>
          {(['fromCampus', 'toCampus'] as const).map((d) => {
            const on = direction === d;
            return (
              <Pressable
                key={d}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setDirection(d)}
                style={[styles.toggleTab, on && { backgroundColor: colors.brandPrimary }]}
              >
                <AppText
                  variant="label"
                  weight={on ? 'semibold' : 'medium'}
                  style={{ color: on ? '#FFFFFF' : colors.inkOnInkMuted }}
                >
                  {d === 'fromCampus' ? t.transport.fromUni : t.transport.toUni}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.routeRow}>
          <View style={styles.route}>
            <Icon name="bus" color={colors.brandPrimary} />
            <View>
              <AppText variant="bodyStrong" style={styles.white}>
                {from ? t.transport.routeFrom : t.transport.routeTo}
              </AppText>
              <AppText variant="tiny" weight="regular" style={{ color: colors.inkOnInkMuted }}>
                {t.transport.tripsSummary}
              </AppText>
            </View>
          </View>
          <View style={[styles.live, { backgroundColor: colors.brandPrimary }]}>
            <View style={styles.liveDot} />
            <AppText size={10} weight="bold" style={styles.white}>
              {t.home.live}
            </AppText>
          </View>
        </View>
        <AppText variant="captionStrong" style={{ color: colors.inkOnInkMuted }}>
          {next === undefined
            ? t.transport.noMoreTrips
            : fmt(from ? t.transport.waitingFrom : t.transport.waitingTo, {
                time: formatTime(next, language),
              })}
        </AppText>
        <View style={styles.times}>
          <TimeBox
            label={from ? t.transport.nextDeparture : t.transport.nextFromMetro}
            time={next === undefined ? '—' : formatTime(next, language)}
            hint={until(next)}
          />
          <TimeBox
            label={t.transport.afterThat}
            time={after === undefined ? '—' : formatTime(after, language)}
            hint={until(after)}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/transport/schedule')}
          style={styles.fullSchedule}
        >
          <Icon name="clock" size={16} color={colors.brandPrimary} />
          <AppText variant="label" style={styles.white}>
            {t.transport.fullSchedule}
          </AppText>
        </Pressable>
      </View>

      <AppText variant="bodyStrong" style={styles.sectionTitle}>
        {t.transport.golfCarts}
      </AppText>
      <View style={styles.carts}>
        {golfCarts.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => router.push('/transport/map')}
            style={[styles.cart, { backgroundColor: colors.backgroundSurface }]}
          >
            <View style={[styles.cartIcon, { backgroundColor: colors.brandPrimary }]}>
              <Icon name="cart" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodySmall" weight="semibold">
                {c.name[language]}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {c.near[language]}
              </AppText>
            </View>
            <Icon name="pin" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function TimeBox({ label, time, hint }: { label: string; time: string; hint: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.timeBox}>
      <AppText variant="tiny" style={{ color: colors.inkOnInkMuted }}>
        {label}
      </AppText>
      <AppText variant="title" weight="bold" style={styles.white}>
        {time}
      </AppText>
      <AppText variant="tiny" weight="semibold" tone="brand">
        {hint}
      </AppText>
    </View>
  );
}

/** Figma StatusToast: green when the shuttle is near, brand orange once it has arrived. */
function StatusToast({ state, onClose }: { state: 'near' | 'arrived'; onClose: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const accent = state === 'near' ? '#2E7D33' : colors.brandPrimary;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.status, { backgroundColor: colors.backgroundPrimary, borderColor: accent }]}
    >
      <View style={[styles.statusIcon, { backgroundColor: accent }]}>
        <AppText size={18}>🚌</AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">
          {state === 'near' ? t.transport.nearTitle : t.transport.arrivedTitle}
        </AppText>
        <AppText variant="label" weight="regular" tone="secondary">
          {state === 'near' ? t.transport.nearBody : t.transport.arrivedBody}
        </AppText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="✕" hitSlop={10} onPress={onClose}>
        <AppText variant="body" tone="secondary">
          ✕
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  white: { color: '#FFFFFF' },
  track: {
    alignSelf: 'flex-end',
    height: 32,
    paddingHorizontal: 22,
    borderRadius: 16,
    justifyContent: 'center',
  },
  shuttle: { borderRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 },
  toggle: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toggleTab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  times: { flexDirection: 'row', gap: 8 },
  timeBox: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fullSchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sectionTitle: { marginTop: 4 },
  carts: { gap: 8 },
  cart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  cartIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    position: 'absolute',
    top: 4,
    left: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    boxShadow: '0px 4px 16px 0px rgba(0,0,0,0.12)',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
