import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LangToggle, Screen, TopBar } from '@/components/ui';
import { Divider, SummaryRow } from '@/components/ui/SummaryRow';
import { fmt, useI18n } from '@/i18n';
import { useCart } from '@/services/cart';
import { formatTime, nowMinutes } from '@/services/clock';
import { findItem, getRestaurant, placeOrder } from '@/services/food';
import { useTheme } from '@/theme';

type Payment = 'mada' | 'cash';

// Figma 04.3 · Checkout (ASAP) and 04.3 · Checkout · Scheduled
export default function Checkout() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const cart = useCart();
  const r = getRestaurant(cart.vendorId ?? undefined);
  const [mode, setMode] = useState<'asap' | 'schedule'>('asap');
  const [payment, setPayment] = useState<Payment>('mada');

  // Pickup slots every 15 min starting 20 min from now, rounded up to the quarter hour.
  const first = Math.ceil((nowMinutes() + 65) / 15) * 15;
  const slots = Array.from({ length: 5 }, (_, i) => first + i * 15);
  const [slot, setSlot] = useState(slots[1]);

  if (!r || !cart.count) return null;
  const price = (n: number) => fmt(t.food.price, { n });
  const total = price(cart.subtotal);
  const readyAt = mode === 'asap' ? nowMinutes() + r.prepMin : slot;
  const short = (m: number) =>
    formatTime(m, language)
      .replace(/ (AM|PM|ص|م)$/, '')
      .replace(/^0/, '');

  const confirm = async () => {
    const order = await placeOrder({
      restaurantId: r.id,
      items: cart.count,
      total: cart.subtotal,
      readyAt,
    });
    cart.clear();
    router.replace({ pathname: '/food/confirmed', params: { order: order.id } });
  };

  return (
    <Screen
      header={<TopBar title={t.food.checkout} boxedBack right={<LangToggle />} />}
      footer={<Button label={fmt(t.food.confirmOrder, { total })} onPress={confirm} />}
    >
      <Card style={styles.card}>
        <AppText variant="bodySmall" weight="semibold">
          {t.food.pickupDetails}
        </AppText>
        <View style={styles.dotRow}>
          <View style={[styles.dot, { backgroundColor: colors.brandPrimary }]} />
          <AppText variant="label" weight="regular" tone="secondary">
            {r.name[language]} · {r.location[language]}
          </AppText>
        </View>
        <AppText variant="caption" tone="secondary" style={styles.indent}>
          {mode === 'asap'
            ? fmt(t.food.readyIn, { n: r.prepMin })
            : fmt(t.food.scheduledFor, { time: formatTime(slot, language) })}
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="bodySmall" weight="semibold">
          {t.food.pickupTime}
        </AppText>
        <View style={styles.modes}>
          {(['asap', 'schedule'] as const).map((m) => {
            const on = mode === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setMode(m)}
                style={[
                  styles.mode,
                  on
                    ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                    : {
                        backgroundColor: colors.backgroundPrimary,
                        borderColor: colors.borderDefault,
                      },
                ]}
              >
                <AppText variant="label" tone={on ? 'onBrand' : 'primary'}>
                  {m === 'asap' ? t.food.asap : t.food.schedule}
                </AppText>
                <AppText variant="tiny" weight="regular" tone={on ? 'onBrand' : 'secondary'}>
                  {m === 'asap' ? fmt(t.food.readyIn, { n: r.prepMin }) : t.food.pickATime}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {mode === 'asap' ? (
          <AppText variant="caption" tone="secondary">
            {t.food.asapHint}
          </AppText>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slots}
          >
            {slots.map((s) => {
              const on = s === slot;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setSlot(s)}
                  style={[
                    styles.slot,
                    on
                      ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                      : { borderColor: colors.borderDefault },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight={on ? 'semibold' : 'regular'}
                    tone={on ? 'onBrand' : 'primary'}
                  >
                    {short(s)}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Card>

      <Card style={styles.card}>
        <AppText variant="bodySmall" weight="semibold">
          {t.food.payment}
        </AppText>
        {(['mada', 'cash'] as const).map((p, i) => {
          const on = payment === p;
          return (
            <View key={p}>
              {i > 0 && <Divider />}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setPayment(p)}
                style={styles.option}
              >
                <View
                  style={[
                    styles.radio,
                    on
                      ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                      : { borderColor: colors.borderDefault },
                  ]}
                >
                  {on && <View style={styles.radioDot} />}
                </View>
                <AppText variant="bodySmall" weight="medium" tone={on ? 'primary' : 'secondary'}>
                  {p === 'mada' ? t.food.mada : t.food.cash}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </Card>

      <Card style={styles.card}>
        <AppText variant="bodySmall" weight="semibold">
          {t.food.summary}
        </AppText>
        {cart.lines.map((l) => (
          <SummaryRow
            key={l.id}
            label={`${findItem(r, l.id)?.name[language] ?? l.name} ×${l.qty}`}
            value={price(l.qty * l.price)}
            muted={false}
          />
        ))}
        <Divider />
        <SummaryRow label={t.food.subtotal} value={total} />
        <SummaryRow label={t.food.discount} value={price(0)} />
        <SummaryRow label={t.food.total} value={total} strong accent />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, borderRadius: 18 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  indent: { marginStart: 16 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  slots: { gap: 6 },
  slot: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
});
