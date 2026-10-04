import { StyleSheet, Switch, View } from 'react-native';

import { AppText, Card, FilterChip, Screen, TopBar } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { useRestaurant } from '@/services/food';
import { setSoldOut, updateRestaurant } from '@/services/kitchen';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

const PREP_CHOICES = [5, 10, 12, 15, 20, 30, 45];

// Restaurant portal · Menu & Settings: open/closed, prep time, sold-out switches per item.
export default function RestaurantMenuSettings() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const { session } = useSession();
  const restaurant = useRestaurant(session?.restaurantId);
  if (!restaurant) return null;

  const open = !restaurant.closed;
  const prepChoices = PREP_CHOICES.includes(restaurant.prepMin)
    ? PREP_CHOICES
    : [...PREP_CHOICES, restaurant.prepMin].sort((a, b) => a - b);
  const switchColors = { true: colors.statusSuccess, false: colors.borderDefault };

  return (
    <Screen header={<TopBar title={t.restaurantPortal.menuTitle} />} gap={14}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t.restaurantPortal.status}</AppText>
            <AppText variant="caption" tone={open ? 'success' : 'error'}>
              {open ? t.restaurantPortal.openHint : t.restaurantPortal.closedHint}
            </AppText>
          </View>
          <Switch
            value={open}
            onValueChange={(v) => updateRestaurant(restaurant.id, { closed: !v })}
            trackColor={{ true: colors.statusSuccess, false: colors.statusError }}
            thumbColor="#FFFFFF"
            accessibilityLabel={t.restaurantPortal.status}
          />
        </View>
        <AppText variant="caption" tone="secondary">
          {t.restaurantPortal.statusHint}
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="bodyStrong">{t.restaurantPortal.prepTitle}</AppText>
        <AppText variant="caption" tone="secondary">
          {t.restaurantPortal.prepHint}
        </AppText>
        <View style={styles.chips}>
          {prepChoices.map((n) => (
            <FilterChip
              key={n}
              label={fmt(t.restaurantPortal.prepValue, { n })}
              selected={restaurant.prepMin === n}
              onPress={() => updateRestaurant(restaurant.id, { prepMin: n })}
            />
          ))}
        </View>
      </Card>

      <View style={styles.gap4}>
        <AppText variant="bodyStrong">{t.restaurantPortal.menuSection}</AppText>
        <AppText variant="caption" tone="secondary">
          {t.restaurantPortal.menuHint}
        </AppText>
      </View>
      {restaurant.categories.map((c) => (
        <View key={c} style={styles.group}>
          <AppText variant="label" tone="secondary">
            {t.food.cat[c]}
          </AppText>
          {restaurant.menu
            .filter((m) => m.category === c)
            .map((m) => (
              <Card key={m.id} style={[styles.item, m.soldOut && styles.dim]}>
                <View style={[styles.emoji, { backgroundColor: m.bg }]}>
                  <AppText size={22}>{m.emoji}</AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodySmall" weight="semibold" numberOfLines={1}>
                    {m.name[language]}
                  </AppText>
                  <AppText variant="caption" tone={m.soldOut ? 'error' : 'secondary'}>
                    {fmt(t.food.price, { n: m.price })} ·{' '}
                    {m.soldOut ? t.restaurantPortal.soldOut : t.restaurantPortal.available}
                  </AppText>
                </View>
                <Switch
                  value={!m.soldOut}
                  onValueChange={(v) => setSoldOut(restaurant.id, m.id, !v)}
                  trackColor={switchColors}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={m.name[language]}
                />
              </Card>
            ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap4: { gap: 4, marginTop: 4 },
  card: { gap: 8, borderRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  group: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  dim: { opacity: 0.6 },
  emoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
