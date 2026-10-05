import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, ConfirmDialog, Screen, TopBar } from '@/components/ui';
import { PopIn } from '@/components/ui/Reveal';
import { useParkingAnswer } from '@/features/parking/ParkingCheck';
import { fmt, useI18n } from '@/i18n';
import { formatTime } from '@/services/clock';
import {
  CHECK_BEFORE_MIN,
  canRefund,
  parkingNow,
  passOnScreen,
  reservation,
} from '@/services/parking';
import { useTheme } from '@/theme';

// Google Maps link to the parking, opened by "Get Directions".
const DIRECTIONS_URL = 'https://maps.app.goo.gl/PcBB2SKaQmC9wiSP9';

// Figma 07 · Parking Reserved
export default function ParkingReserved() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const r = reservation.useValue();
  const { confirm, cancel, busy } = useParkingAnswer();
  const [asking, setAsking] = useState(false);
  // This screen asks "still coming?" itself, so the pop-up waits until the student leaves it.
  useFocusEffect(
    useCallback(() => {
      passOnScreen.set(true);
      return () => passOnScreen.set(false);
    }, []),
  );
  if (!r) return null;

  const now = parkingNow();
  const refundable = canRefund(r, now);
  const askNow = !r.confirmed && now >= r.arriveAt - CHECK_BEFORE_MIN;
  const status = r.confirmed
    ? t.parking.statusConfirmed
    : askNow
      ? t.parking.statusAsk
      : t.parking.statusWaiting;
  const amount = fmt(t.food.price, { n: r.amount });

  const method = { applePay: t.parking.applePay, mada: t.parking.mada, stcPay: t.parking.stcPay }[
    r.method
  ];
  const done = () => router.dismissTo('/parking');

  return (
    <Screen header={<TopBar title={t.parking.reservedTitle} onBack={done} />} gutter={32}>
      <View style={styles.body}>
        <PopIn style={[styles.check, { backgroundColor: colors.statusSuccess }]}>
          <AppText size={44} weight="bold" tone="onBrand">
            ✓
          </AppText>
        </PopIn>
        <AppText variant="display" align="center">
          {t.parking.reserved}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" align="center">
          {t.parking.reservedBody}
        </AppText>

        <View style={[styles.pass, { backgroundColor: colors.inkPrimary }]}>
          <View style={styles.between}>
            <View>
              <AppText variant="tiny" weight="semibold" style={{ color: colors.inkOnInkMuted }}>
                {t.parking.slotLabel}
              </AppText>
              <AppText size={30} weight="bold" tone="brand">
                {r.slot}
              </AppText>
            </View>
            <View style={styles.end}>
              <AppText variant="tiny" weight="semibold" style={{ color: colors.inkOnInkMuted }}>
                {t.parking.zoneLabel}
              </AppText>
              <AppText size={30} weight="bold" style={styles.white}>
                P
              </AppText>
            </View>
          </View>
          {r.number && <PassRow label={t.parking.reservationNo} value={r.number} />}
          <PassRow label={t.parking.arrivalLabel} value={formatTime(r.arriveAt, language)} />
          <PassRow label={t.parking.statusLabel} value={status} />
          <PassRow label={t.parking.valid} value={t.parking.validUntil} />
          <PassRow
            label={t.parking.paidLabel}
            value={fmt(t.parking.paidWith, { amount: fmt(t.food.price, { n: r.amount }), method })}
          />
        </View>

        {askNow && refundable && (
          <Button label={t.parking.check.yes} style={styles.full} onPress={() => confirm(r)} />
        )}
        <Button
          label={t.parking.directions}
          style={styles.full}
          onPress={() => Linking.openURL(DIRECTIONS_URL).catch(() => {})}
        />
        <Button label={t.common.done} variant="secondary" style={styles.full} onPress={done} />
        {/* Always possible: a full refund inside the window, after it the spot is just freed */}
        <Button
          label={refundable ? t.parking.check.cancel : t.parking.check.cancelNoRefund}
          variant="danger"
          style={styles.full}
          disabled={busy}
          onPress={() => setAsking(true)}
        />
      </View>
      <ConfirmDialog
        visible={asking}
        title={t.parking.check.cancelTitle}
        body={fmt(refundable ? t.parking.check.cancelBody : t.parking.check.cancelLateBody, {
          amount,
          slot: r.slot,
        })}
        keepLabel={t.parking.check.keep}
        confirmLabel={refundable ? t.parking.check.cancel : t.parking.check.cancelNoRefund}
        onKeep={() => setAsking(false)}
        onConfirm={async () => {
          setAsking(false);
          if (await cancel(r)) done();
        }}
      />
    </Screen>
  );
}

function PassRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.between}>
      <AppText variant="label" weight="regular" style={{ color: colors.inkOnInkMuted }}>
        {label}
      </AppText>
      <AppText variant="label" style={styles.white}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 18, marginTop: 60 },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pass: { alignSelf: 'stretch', borderRadius: 18, padding: 18, gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  end: { alignItems: 'flex-end' },
  white: { color: '#FFFFFF' },
  full: { alignSelf: 'stretch' },
});
