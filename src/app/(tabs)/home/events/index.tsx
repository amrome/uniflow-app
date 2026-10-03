import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, IconBubble, Screen, TopBar } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { AllClubsSheet, EventRow } from '@/features/events/components';
import { fmt, useI18n } from '@/i18n';
import { useDataLoading } from '@/services/data';
import {
  events,
  going,
  publishedEvents,
  useClubs,
  type CampusEvent,
  type EventKind,
} from '@/services/events';
import { useTheme } from '@/theme';

type Filter = 'all' | EventKind;

// Figma 08 · Events, 08.2 · University Events, 08.3 · Club Events (+ Popup/AllClubs)
export default function Events() {
  const params = useLocalSearchParams<{ club?: string }>();
  const { t, language, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const all = publishedEvents(events.useValue());
  const clubs = useClubs();
  const loading = useDataLoading();
  const goingIds = going.useValue();
  const [filter, setFilter] = useState<Filter>(params.club ? 'club' : 'all');
  const [clubId, setClubId] = useState<string | undefined>(params.club);
  const [showClubs, setShowClubs] = useState(false);

  const list = all
    .filter((e) => filter === 'all' || e.kind === filter)
    .filter((e) => !clubId || e.clubId === clubId)
    .sort((a, b) => a.dayOffset - b.dayOffset);
  const sections: [string, CampusEvent[]][] = [
    [t.events.going, list.filter((e) => goingIds.includes(e.id))],
    [t.events.today, list.filter((e) => !goingIds.includes(e.id) && e.dayOffset === 0)],
    [t.events.upcoming, list.filter((e) => !goingIds.includes(e.id) && e.dayOffset > 0)],
  ];
  const clubName = clubs.find((c) => c.id === clubId)?.name[language];

  const pick = (f: Filter) => {
    setFilter(f);
    setClubId(undefined);
  };

  return (
    <Screen header={<TopBar title={t.events.title} />} gap={9}>
      <View style={styles.filters}>
        {(
          [
            ['all', t.events.all],
            ['university', t.events.university],
            ['club', t.events.clubs],
          ] as const
        ).map(([f, label]) => {
          const on = filter === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => pick(f)}
              style={[
                styles.filter,
                on
                  ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                  : {
                      backgroundColor: colors.backgroundSurface,
                      borderColor: colors.borderDefault,
                    },
              ]}
            >
              <AppText
                variant="label"
                weight={on ? 'semibold' : 'medium'}
                tone={on ? 'onBrand' : 'primary'}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
        <View style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowClubs(true)}
          style={[styles.allClubs, { borderColor: colors.brandPrimary }]}
        >
          <AppText variant="label" tone="brand">
            {fmt(t.events.allClubs, { n: clubs.length })}
          </AppText>
          <AppText variant="bodyStrong" weight="bold" tone="brand">
            {isRTL ? '‹' : '›'}
          </AppText>
        </Pressable>
      </View>

      {filter !== 'all' && (
        <View style={[styles.banner, { backgroundColor: colors.brandPrimarySoft }]}>
          <IconBubble
            name={filter === 'club' ? 'users' : 'calendar'}
            tone="brand"
            size={40}
            iconSize={20}
          />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">
              {clubName ?? (filter === 'club' ? t.events.clubBanner : t.events.uniBanner)}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {filter === 'club' ? t.events.clubBannerSub : t.events.uniBannerSub}
            </AppText>
          </View>
          {clubId && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.events.close}
              hitSlop={10}
              onPress={() => setClubId(undefined)}
            >
              <Icon name="chevronLeft" size={18} color={colors.textSecondary} flipRTL />
            </Pressable>
          )}
        </View>
      )}

      {loading && all.length === 0 && (
        <View style={styles.section}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={104} />
          ))}
        </View>
      )}
      {!loading && list.length === 0 && (
        <AppText tone="secondary" align="center" style={styles.empty}>
          {t.events.empty}
        </AppText>
      )}
      {sections.map(
        ([title, items]) =>
          items.length > 0 && (
            <View key={title} style={styles.section}>
              <AppText variant="bodyStrong">{title}</AppText>
              {items.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  going={goingIds.includes(e.id)}
                  onPress={() =>
                    router.push({ pathname: '/home/events/[id]', params: { id: e.id } })
                  }
                />
              ))}
            </View>
          ),
      )}

      <AllClubsSheet
        visible={showClubs}
        onClose={() => setShowClubs(false)}
        onPick={(id) => {
          setShowClubs(false);
          setFilter('club');
          setClubId(id);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  filter: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  allClubs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    marginBottom: 6,
  },
  section: { gap: 9 },
  empty: { marginTop: 40 },
});
