import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Card, Chip, Screen, TopBar } from '@/components/ui';
import { SearchField } from '@/features/food/components';
import { Avatar, NotifyButton, ohLabel } from '@/features/schedules/components';
import { fmt, useI18n } from '@/i18n';
import {
  favoriteInstructors,
  instructors,
  isAvailableToday,
  majorIds,
  majors,
  portal,
  type Instructor,
  type Major,
} from '@/services/schedules';
import { useTheme } from '@/theme';

// Figma 03 · Instructor Schedules and 03.2–03.8 (filtered by major)
export default function InstructorSchedules() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const favorites = favoriteInstructors.useValue();
  portal.useValue(); // re-render when an instructor updates their status
  const [major, setMajor] = useState<Major | 'all'>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const list = instructors.filter(
    (i) =>
      (major === 'all' || i.major === major) &&
      (!q ||
        i.name.en.toLowerCase().includes(q) ||
        i.name.ar.includes(q) ||
        i.courses.some((c) => c.en.toLowerCase().includes(q) || c.ar.includes(q))),
  );
  const favs = instructors.filter((i) => favorites.includes(i.id));
  const open = (i: Instructor) =>
    router.push({ pathname: '/home/schedules/[id]', params: { id: i.id } });

  return (
    <Screen header={<TopBar title={t.schedules.title} />} gap={12}>
      <SearchField value={query} onChangeText={setQuery} placeholder={t.schedules.search} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.filters}
      >
        {(['all', ...majorIds] as const).map((m) => {
          const on = major === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setMajor(m)}
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
                {m === 'all' ? t.schedules.all : majors[m].short[language]}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {major === 'all' && !q && favs.length > 0 && (
        <>
          <View style={styles.row}>
            <Icon name="heart" size={15} color={colors.brandPrimary} fill={colors.brandPrimary} />
            <AppText variant="bodySmall" weight="semibold">
              {t.schedules.favorites}
            </AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favs}
          >
            {favs.map((i) => (
              <Pressable
                key={i.id}
                accessibilityRole="button"
                onPress={() => open(i)}
                style={[styles.fav, { borderColor: colors.borderDefault }]}
              >
                <Avatar name={i.name[language]} size={30} />
                <AppText variant="label" weight="medium">
                  {i.name[language].replace(/^(Dr\.|د\.)\s*/, '')}
                </AppText>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isAvailableToday(i)
                        ? colors.statusSuccess
                        : colors.borderDefault,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {major !== 'all' && (
        <AppText variant="label" weight="medium" tone="secondary">
          {fmt(t.schedules.count, { major: majors[major][language], n: list.length })}
        </AppText>
      )}

      {list.length === 0 && (
        <AppText tone="secondary" align="center">
          {t.schedules.none}
        </AppText>
      )}
      {list.map((i) => {
        const fav = favorites.includes(i.id);
        const available = isAvailableToday(i);
        return (
          <Card
            key={i.id}
            onPress={() => open(i)}
            style={styles.card}
            accessibilityLabel={i.name[language]}
          >
            <Avatar name={i.name[language]} />
            <View style={styles.flex}>
              <AppText variant="bodySmall" weight="semibold" numberOfLines={1}>
                {i.name[language]}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {majors[i.major][language]}
              </AppText>
              <AppText variant="captionStrong" tone={available ? 'primary' : 'secondary'}>
                {ohLabel(i, t, language)}
              </AppText>
            </View>
            {available ? (
              <Chip label={t.schedules.available} tone="successSoft" dot />
            ) : (
              <NotifyButton instructorId={i.id} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.schedules.favorites}
              accessibilityState={{ selected: fav }}
              hitSlop={8}
              onPress={() => favoriteInstructors.toggle(i.id)}
              style={styles.heart}
            >
              <Icon
                name="heart"
                size={18}
                color={fav ? colors.brandPrimary : colors.textSecondary}
                fill={fav ? colors.brandPrimary : 'none'}
              />
            </Pressable>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bleed: { marginHorizontal: -20 },
  filters: { gap: 8, paddingHorizontal: 20 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  favs: { gap: 10 },
  fav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingStart: 6,
    paddingEnd: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  heart: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
});
