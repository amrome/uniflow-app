import { useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TopBar } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { reservation } from '@/services/parking';
import { useTheme } from '@/theme';

// YU main gate, used for "Get Directions".
const ZONE_P = { lat: 24.8607, lng: 46.7187 };

// Figma 07 · Parking Reserved
export default function ParkingReserved() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const r = reservation.useValue();
  if (!r) return null;

  const method = { applePay: t.parking.applePay, mada: t.parking.mada, stcPay: t.parking.stcPay }[
    r.method
  ];
  const done = () => router.dismissTo('/parking');

  return (
    <Screen header={<TopBar title={t.parking.reservedTitle} onBack={done} />} gutter={32}>
      <View style={styles.body}>
        <View style={[styles.check, { backgroundColor: colors.statusSuccess }]}>
          <AppText size={44} weight="bold" tone="onBrand">
            ✓
          </AppText>
        </View>
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
          <PassRow label={t.parking.valid} value={t.parking.validUntil} />
          <PassRow
            label={t.parking.paidLabel}
            value={fmt(t.parking.paidWith, { amount: fmt(t.food.price, { n: r.amount }), method })}
          />
        </View>

        <Button
          label={t.parking.directions}
          style={styles.full}
          onPress={() =>
            Linking.openURL(`https://maps.google.com/?q=${ZONE_P.lat},${ZONE_P.lng}`).catch(
              () => {},
            )
          }
        />
        <Button label={t.common.done} variant="secondary" style={styles.full} onPress={done} />
      </View>
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
