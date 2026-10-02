import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LangToggle, Screen, TopBar } from '@/components/ui';
import { Divider, SummaryRow } from '@/components/ui/SummaryRow';
import { fmt, useI18n } from '@/i18n';
import { useCart } from '@/services/cart';
import { findItem, useRestaurant } from '@/services/food';
import { useTheme } from '@/theme';

// Figma 04.2 · View Cart
export default function Cart() {
  const { t, language, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { lines, count, subtotal, vendorId } = useCart();
  const r = useRestaurant(vendorId ?? undefined);
  const price = (n: number) => fmt(t.food.price, { n });
  const header = <TopBar title={t.food.cartTitle} boxedBack right={<LangToggle />} />;

  if (!r || !count) {
    return (
      <Screen header={header} contentStyle={styles.empty}>
        <AppText size={44} align="center">
          🛒
        </AppText>
        <AppText variant="title" align="center">
          {t.food.emptyCart}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" align="center">
          {t.food.emptyCartSub}
        </AppText>
        <Button label={t.food.browse} onPress={() => router.navigate('/food')} />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <Button
          label={fmt(t.food.proceed, { total: price(subtotal) })}
          onPress={() => router.push('/food/checkout')}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/food/[id]', params: { id: r.id } })}
        style={[
          styles.surface,
          { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
        ]}
      >
        <AppText variant="bodySmall" weight="semibold">
          {r.name[language]}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {fmt(t.food.itemsCount, { n: count, restaurant: t.food.change })}
        </AppText>
      </Pressable>

      <Card style={styles.card}>
        <AppText variant="bodySmall" weight="semibold">
          {t.food.items}
        </AppText>
        {lines.map((l) => {
          const item = findItem(r, l.id);
          return (
            <View key={l.id} style={styles.line}>
              <View style={styles.lineRow}>
                <AppText variant="label" weight="medium" style={styles.flex}>
                  {item?.name[language] ?? l.name}
                </AppText>
                <AppText variant="label" tone="brand">
                  {price(l.qty * l.price)}
                </AppText>
              </View>
              <AppText variant="caption" tone="secondary">
                ×{l.qty}
              </AppText>
              <Divider />
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/food/[id]', params: { id: r.id } })}
        >
          <AppText variant="label" weight="medium" tone="brand">
            {t.food.addMore}
          </AppText>
        </Pressable>
      </Card>

      <Card style={styles.pickup}>
        <AppText variant="headingSmall" weight="regular" tone="brand">
          ⏱
        </AppText>
        <View>
          <AppText variant="label" weight="medium">
            {fmt(t.food.pickupIn, { n: r.prepMin })}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {r.name[language]} · {r.location[language]}
          </AppText>
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => Alert.alert(t.food.promo, t.food.promoPrompt)}
        style={[
          styles.promo,
          { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
        ]}
      >
        <AppText variant="headingSmall" weight="regular">
          🏷
        </AppText>
        <AppText variant="label" weight="medium" tone="secondary" style={styles.flex}>
          {t.food.promo}
        </AppText>
        <AppText variant="title" weight="bold" tone="secondary">
          {isRTL ? '‹' : '›'}
        </AppText>
      </Pressable>

      <Card style={styles.card}>
        <AppText variant="bodySmall" weight="semibold">
          {t.food.summary}
        </AppText>
        <SummaryRow label={t.food.subtotal} value={price(subtotal)} />
        <SummaryRow label={t.food.serviceFee} value={t.food.free} />
        <SummaryRow label={t.food.total} value={price(subtotal)} strong accent />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { flexGrow: 1, justifyContent: 'center', gap: 12 },
  surface: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 10, gap: 2 },
  card: { gap: 10, borderRadius: 18 },
  line: { gap: 2 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18 },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 56,
  },
});
