import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Card, Chip, Screen, TopBar } from '@/components/ui';
import { CartBar, Stepper } from '@/features/food/components';
import { fmt, useI18n } from '@/i18n';
import { useCart } from '@/services/cart';
import {
  favoriteLines,
  favoriteRestaurants,
  findItem,
  useRestaurant,
  type MenuCategory,
  type MenuItem,
} from '@/services/food';
import { useTheme } from '@/theme';

// Figma 04.1 · Kafton Menu (same layout for every restaurant)
export default function RestaurantMenu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const cart = useCart();
  const favorites = favoriteRestaurants.useValue();
  const [category, setCategory] = useState<MenuCategory | 'all'>('all');
  const r = useRestaurant(id);
  if (!r) return null;

  const fav = favorites.includes(r.id);
  const items = r.menu.filter((m) => category === 'all' || m.category === category);
  const favOrder = r.favoriteOrder;
  const favTotal = favoriteLines(r).reduce((n, l) => n + l.qty * l.price, 0);
  const favSummary = favOrder?.lines
    .map(([itemId, qty]) => {
      const item = findItem(r, itemId);
      return item ? `${item.name[language]}${qty > 1 ? ` ×${qty}` : ''}` : '';
    })
    .join(' · ');

  const add = (m: MenuItem) =>
    cart.add({ id: m.id, vendorId: r.id, name: m.name.en, price: m.price });

  return (
    <View style={styles.flex}>
      <Screen header={<TopBar title={r.name[language]} />} gap={16}>
        <Card style={styles.header}>
          {r.logo && (
            <Image
              source={r.logo}
              style={[styles.logo, { borderColor: colors.borderDefault }]}
              contentFit="contain"
            />
          )}
          <View style={styles.headerText}>
            <AppText variant="title" weight="bold" size={18}>
              {r.name[language]}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {r.cuisine[language]}
            </AppText>
            <View style={styles.metaRow}>
              {r.rating && (
                <View style={[styles.rating, { backgroundColor: colors.statusSuccessSoft }]}>
                  <AppText variant="tiny" weight="bold" tone="success">
                    ⭐ {r.rating}
                  </AppText>
                </View>
              )}
              <Chip label={t.food.available} tone="successSoft" dot />
            </View>
            <View style={styles.metaRow}>
              <Icon name="clock" size={13} color={colors.brandPrimary} />
              <AppText variant="tiny">{fmt(t.food.prep, { n: r.prepMin })}</AppText>
              <Icon name="pin" size={13} color={colors.textSecondary} />
              <AppText variant="tiny">{r.location[language]}</AppText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.food.favorites}
            accessibilityState={{ selected: fav }}
            onPress={() => favoriteRestaurants.toggle(r.id)}
            style={[
              styles.favBtn,
              { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
            ]}
          >
            <Icon
              name="heart"
              size={20}
              color={colors.brandPrimary}
              fill={fav ? colors.brandPrimary : 'none'}
            />
          </Pressable>
        </Card>

        {favOrder && (
          <View
            style={[
              styles.favOrder,
              { backgroundColor: 'rgba(246,137,56,0.1)', borderColor: colors.brandPrimary },
            ]}
          >
            <View style={styles.metaRow}>
              <Icon name="star" size={14} color={colors.brandPrimary} fill={colors.brandPrimary} />
              <AppText variant="label" tone="brand">
                {t.food.favoriteOrder}
              </AppText>
            </View>
            <View style={styles.favOrderRow}>
              <View style={styles.flex}>
                <AppText variant="bodySmall" weight="semibold" numberOfLines={1}>
                  {favSummary}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {fmt(t.food.orderedTimes, {
                    n: favOrder.timesOrdered,
                    total: fmt(t.food.price, { n: favTotal }),
                  })}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  cart.replace(favoriteLines(r));
                  router.push('/food/cart');
                }}
                style={[styles.reorder, { backgroundColor: colors.brandPrimary }]}
              >
                <Icon name="repeat" size={16} color="#FFFFFF" />
                <AppText variant="bodySmall" weight="semibold" tone="onBrand">
                  {t.food.reorder}
                </AppText>
              </Pressable>
            </View>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cats}
          style={styles.catsScroll}
        >
          {(['all', ...r.categories] as const).map((c) => {
            const on = category === c;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setCategory(c)}
                style={[
                  styles.cat,
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
                  {c === 'all' ? t.food.all : t.food.cat[c]}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.items}>
          {items.map((m) => {
            const qty = cart.qtyOf(m.id);
            return (
              <Card key={m.id} style={styles.item}>
                <View style={[styles.emoji, { backgroundColor: m.bg }]}>
                  <AppText size={26}>{m.emoji}</AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodySmall" weight="semibold" numberOfLines={1}>
                    {m.name[language]}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {m.desc[language]}
                  </AppText>
                  <View style={styles.metaRow}>
                    <AppText variant="label" weight="bold" tone="brand">
                      {fmt(t.food.price, { n: m.price })}
                    </AppText>
                    {m.popular && (
                      <View style={[styles.popular, { backgroundColor: colors.brandPrimary }]}>
                        <AppText size={9} weight="bold" tone="onBrand">
                          {t.food.popular}
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>
                {qty > 0 ? (
                  <Stepper qty={qty} onInc={() => add(m)} onDec={() => cart.decrement(m.id)} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.food.add} ${m.name[language]}`}
                    onPress={() => add(m)}
                    style={[
                      styles.addBtn,
                      {
                        backgroundColor: colors.backgroundSurface,
                        borderColor: colors.borderDefault,
                      },
                    ]}
                  >
                    <AppText variant="headingSmall">{t.food.add}</AppText>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </View>
      </Screen>
      <CartBar />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  logo: { width: 68, height: 68, borderRadius: 14, borderWidth: 1 },
  headerText: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rating: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favOrder: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  favOrderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reorder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  catsScroll: { marginHorizontal: -20 },
  cats: { gap: 8, paddingHorizontal: 20 },
  cat: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  items: { gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  emoji: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popular: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
});
