import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, Card, Screen, TopBar } from '@/components/ui';
import { Divider, SummaryRow } from '@/components/ui/SummaryRow';
import { fmt, useI18n } from '@/i18n';
import { live } from '@/services/backend';
import { formatDate } from '@/services/clock';
import { reportError } from '@/services/errors';
import { reserveSlot, usePaidZone, type PaymentMethod } from '@/services/parking';
import { useTheme } from '@/theme';

// Figma 06.1 · Parking Payment
export default function ParkingPayment() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('applePay');
  const [paying, setPaying] = useState(false);
  const paidZone = usePaidZone();
  const amount = fmt(t.food.price, { n: paidZone.price });
  const labels: Record<PaymentMethod, string> = {
    applePay: t.parking.applePay,
    mada: t.parking.mada,
    stcPay: t.parking.stcPay,
  };

  const pay = async () => {
    setPaying(true);
    try {
      await reserveSlot(method);
      router.replace('/parking/reserved');
    } catch (e) {
      reportError(e);
    } finally {
      setPaying(false);
    }
  };

  return (
    <Screen
      header={<TopBar title={t.parking.checkout} />}
      footer={<Button label={fmt(t.parking.pay, { amount })} onPress={pay} disabled={paying} />}
    >
      <AppText variant="headingSmall">{t.parking.summary}</AppText>
      <Card style={styles.summary}>
        <SummaryRow label={t.parking.parking} value={t.parking.paidZone} muted={false} />
        <SummaryRow
          label={t.parking.slot}
          value={live ? t.parking.autoAssignedAtPay : fmt(t.parking.autoAssigned, { slot: 'P-17' })}
          muted={false}
        />
        <SummaryRow
          label={t.parking.date}
          value={fmt(t.parking.today, { date: formatDate(new Date(), language) })}
          muted={false}
        />
        <SummaryRow label={t.parking.valid} value={t.parking.validHours} muted={false} />
        <Divider />
        <SummaryRow label={t.parking.total} value={amount} muted={false} />
      </Card>

      <AppText variant="headingSmall" style={styles.sectionTop}>
        {t.parking.method}
      </AppText>
      {(['applePay', 'mada', 'stcPay'] as const).map((m) => {
        const on = method === m;
        return (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setMethod(m)}
            style={[
              styles.method,
              {
                backgroundColor: colors.backgroundPrimary,
                borderColor: on ? colors.brandPrimary : colors.borderDefault,
                borderWidth: on ? 2 : 1,
              },
            ]}
          >
            <Icon name="card" size={22} color={on ? colors.brandPrimary : colors.textSecondary} />
            <AppText variant="bodySmall" weight="medium" style={styles.flex}>
              {labels[m]}
            </AppText>
            <View
              style={[
                styles.radio,
                on
                  ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                  : { borderColor: colors.borderDefault },
              ]}
            />
          </Pressable>
        );
      })}

      <View style={[styles.note, { backgroundColor: 'rgba(246,137,56,0.1)' }]}>
        <Icon name="clock" size={16} color={colors.brandPrimary} />
        <AppText variant="captionStrong" style={styles.flex}>
          {t.parking.refundNote}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: 10, borderRadius: 18 },
  sectionTop: { marginTop: 14 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: -6,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 40,
  },
});
