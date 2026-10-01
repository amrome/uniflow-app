import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Card, Chip, Screen, TopBar } from '@/components/ui';
import { CartBar, SearchField } from '@/features/food/components';
import { fmt, useI18n } from '@/i18n';
import { favoriteRestaurants, restaurants, type Restaurant } from '@/services/food';
import { useTheme } from '@/theme';

// Figma 04 · Food Menu
export default function FoodMenu() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const favorites = favoriteRestaurants.use();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = (r: Restaurant) =>
    !q ||
    r.name[language].toLowerCase().includes(q) ||
    r.cuisine[language].toLowerCase().includes(q) ||
    r.menu.some((m) => m.name[language].toLowerCase().includes(q));
  const list = restaurants.filter(matches);
  const favs = restaurants.filter((r) => favorites.includes(r.id));
  const rows: Restaurant[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));

  return (
    <View style={styles.flex}>
      <Screen header={<TopBar title={t.food.title} />} gap={14}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t.food.search} />

        {!q && favs.length > 0 && (
          <>
            <View style={styles.favHeader}>
              <Icon name="heart" size={16} color={colors.brandPrimary} fill={colors.brandPrimary} />
              <AppText variant="bodyStrong">{t.food.favorites}</AppText>
            </View>
            <View style={styles.favRow}>
              {favs.map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/food/[id]', params: { id: r.id } })}
                  style={[styles.fav, { borderColor: colors.borderDefault }]}
                >
                  {r.logo && <Image source={r.logo} style={styles.favLogo} contentFit="cover" />}
                  <View>
                    <AppText variant="bodySmall" weight="semibold">
                      {r.name[language]}
                    </AppText>
                    <AppText variant="tiny" weight="regular" tone="secondary">
                      {fmt(t.food.minutes, { n: r.prepMin })}
                    </AppText>
                  </View>
                  <Icon
                    name="heart"
                    size={16}
                    color={colors.brandPrimary}
                    fill={colors.brandPrimary}
                  />
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View>
          <AppText variant="title">{t.food.restaurants}</AppText>
          <AppText variant="caption" tone="secondary">
            {t.food.restaurantsSub}
          </AppText>
        </View>

        {list.length === 0 && (
          <AppText tone="secondary" align="center">
            {fmt(t.food.noResults, { q: query.trim() })}
          </AppText>
        )}
        {rows.map((row) => (
          <View key={row[0].id} style={styles.row}>
            {row.map((r) => (
              <RestaurantCard key={r.id} r={r} />
            ))}
            {row.length === 1 && <View style={styles.flex} />}
          </View>
        ))}
      </Screen>
      <CartBar />
    </View>
  );
}

function RestaurantCard({ r }: { r: Restaurant }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Card
      onPress={
        r.comingSoon
          ? undefined
          : () => router.push({ pathname: '/food/[id]', params: { id: r.id } })
      }
      accessibilityLabel={r.name[language]}
      style={styles.card}
    >
      {r.logo ? (
        <Image source={r.logo} style={styles.cover} contentFit="cover" />
      ) : (
        <View style={[styles.cover, { backgroundColor: '#523D38' }]} />
      )}
      <View style={styles.cardBody}>
        <AppText
          variant="bodyStrong"
          tone={r.comingSoon ? 'secondary' : 'primary'}
          numberOfLines={1}
        >
          {r.name[language]}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {r.cuisine[language]}
        </AppText>
        {r.comingSoon ? (
          <Chip label={t.food.openingSoon} />
        ) : (
          <View style={styles.meta}>
            <View style={[styles.time, { backgroundColor: 'rgba(246,137,56,0.12)' }]}>
              <Icon name="clock" size={12} color={colors.brandPrimary} />
              <AppText variant="tiny" weight="semibold" tone="brand">
                {fmt(t.food.minutes, { n: r.prepMin })}
              </AppText>
            </View>
            <AppText
              variant="tiny"
              weight="regular"
              tone="secondary"
              numberOfLines={1}
              style={styles.flex}
            >
              {r.location[language]}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  favHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  favRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  fav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingStart: 8,
    paddingEnd: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  favLogo: { width: 40, height: 40, borderRadius: 10 },
  row: { flexDirection: 'row', gap: 14 },
  card: { flex: 1, padding: 0, overflow: 'hidden' },
  cover: { height: 130, width: '100%' },
  cardBody: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14, gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
