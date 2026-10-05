import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, TopBar } from '@/components/ui';
import { PopIn } from '@/components/ui/Reveal';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { fmt, useI18n } from '@/i18n';
import { formatTime } from '@/services/clock';
import { getOrder, useOrderStatus, useRestaurant, type OrderStatus } from '@/services/food';
import { useTheme } from '@/theme';

// Figma 05 · Order Confirmation
export default function OrderConfirmation() {
  const { order: orderId } = useLocalSearchParams<{ order: string }>();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const order = getOrder(orderId);
  const r = useRestaurant(order?.restaurantId);
  const status = useOrderStatus(order?.id);
  if (!order || !r) return null;

  const done = () => router.dismissTo('/food');

  return (
    <Screen header={<TopBar title={t.food.confirmTitle} onBack={done} />} gutter={32}>
      <View style={styles.body}>
        <PopIn style={[styles.check, { backgroundColor: colors.statusSuccess }]}>
          <AppText size={44} weight="bold" tone="onBrand">
            ✓
          </AppText>
        </PopIn>
        <AppText variant="display" align="center">
          {t.food.placed}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" align="center">
          {fmt(t.food.placedBody, {
            restaurant: r.name[language],
            time: formatTime(order.readyAt, language),
          })}
        </AppText>
        <OrderProgress status={status} />
        {status === 'ready' && (
          <AppText variant="bodySmall" weight="semibold" tone="success" align="center">
            {fmt(t.food.readyBody, { restaurant: r.name[language], number: order.id })}
          </AppText>
        )}
        <Card style={styles.card}>
          <SummaryRow label={t.food.orderNo} value={order.id} muted={false} />
          <SummaryRow label={t.food.items} value={String(order.items)} muted={false} />
          <SummaryRow label={t.food.pickup} value={r.name[language]} muted={false} />
          <SummaryRow
            label={t.food.total}
            value={fmt(t.food.price, { n: order.total })}
            muted={false}
          />
        </Card>
        <Button label={t.common.done} onPress={done} style={styles.full} />
      </View>
    </Screen>
  );
}

const STEPS: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed'];

/** Live progress from the restaurant: sent → being prepared → ready → picked up. */
function OrderProgress({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  if (status === 'cancelled') {
    return (
      <Card tone="surface" style={styles.card}>
        <AppText variant="bodyStrong" tone="error" align="center">
          {t.food.status.cancelled}
        </AppText>
      </Card>
    );
  }
  const at = STEPS.indexOf(status);
  return (
    <Card style={styles.card} accessibilityLabel={t.food.statusTitle}>
      <AppText variant="label" tone="secondary">
        {t.food.statusTitle}
      </AppText>
      {STEPS.map((s, i) => {
        const reached = i <= at;
        const current = i === at;
        const tint = s === 'ready' || s === 'completed' ? colors.statusSuccess : colors.brandPrimary;
        return (
          <View key={s} style={styles.step}>
            <View
              style={[
                styles.stepDot,
                reached
                  ? { backgroundColor: tint, borderColor: tint }
                  : { borderColor: colors.borderDefault },
              ]}
            />
            <AppText
              variant="bodySmall"
              weight={current ? 'bold' : 'regular'}
              tone={reached ? 'primary' : 'secondary'}
            >
              {t.food.status[s]}
            </AppText>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  body: { alignItems: 'center', gap: 20, marginTop: 40 },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { alignSelf: 'stretch', gap: 8, borderRadius: 18 },
  full: { alignSelf: 'stretch' },
});
