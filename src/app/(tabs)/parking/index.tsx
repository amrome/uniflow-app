import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, Card, Chip, Screen, TopBar } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { fmt, useI18n } from '@/i18n';
import {
  freeZones,
  paidZone,
  reservation,
  spotAlerts,
  zoneStatus,
  type FreeZone,
} from '@/services/parking';
import { useTheme } from '@/theme';

// Figma 06 · Parking (+ Toast/SpotAlert)
export default function Parking() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const booked = reservation.use();
  const freeNow = freeZones.reduce((n, z) => n + z.free, 0);
  const free = booked ? paidZone.free - 1 : paidZone.free;
  const used = (paidZone.total - free) / paidZone.total;

  return (
    <Screen header={<TopBar title={t.parking.title} />} gap={12}>
      <View style={[styles.paid, { backgroundColor: colors.inkPrimary }]}>
        <View style={styles.between}>
          <View style={styles.row}>
            <View style={[styles.pIcon, { backgroundColor: colors.brandPrimary }]}>
              <Icon name="parking" size={22} color="#FFFFFF" />
            </View>
            <View>
              <AppText variant="headingSmall" style={styles.white}>
                {t.parking.paid}
              </AppText>
              <AppText variant="caption" style={{ color: colors.inkOnInkMuted }}>
                {t.parking.paidSub}
              </AppText>
            </View>
          </View>
          <View style={styles.price}>
            <AppText variant="title" weight="bold" size={18} tone="brand">
              {fmt(t.food.price, { n: paidZone.price })}
            </AppText>
            <AppText variant="tiny" weight="regular" style={{ color: colors.inkOnInkMuted }}>
              {t.parking.perDay}
            </AppText>
          </View>
        </View>
        <View style={styles.count}>
          <AppText size={30} weight="bold" style={[styles.white, { letterSpacing: -0.6 }]}>
            {free}
          </AppText>
          <AppText variant="bodySmall" weight="medium" style={{ color: colors.inkOnInkMuted }}>
            {fmt(t.parking.slotsFree, { total: paidZone.total })}
          </AppText>
        </View>
        <View style={[styles.bar, { height: 8, backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <View
            style={[styles.fill, { width: `${used * 100}%`, backgroundColor: colors.brandPrimary }]}
          />
        </View>
        <View style={styles.row}>
          <AppText variant="caption" weight="bold" tone="brand">
            •
          </AppText>
          <AppText variant="caption" style={{ color: colors.inkOnInkMuted }}>
            {t.parking.rule}
          </AppText>
        </View>
        <Button
          label={booked ? fmt(t.parking.viewPass, { slot: booked.slot }) : t.parking.reserve}
          onPress={() => router.push(booked ? '/parking/reserved' : '/parking/payment')}
        />
      </View>

      <View style={[styles.between, styles.sectionTop]}>
        <View style={styles.row}>
          <AppText variant="title">{t.parking.title}</AppText>
          <View style={[styles.freeTag, { backgroundColor: colors.statusSuccess }]}>
            <AppText size={10} weight="bold" tone="onBrand">
              {t.parking.free}
            </AppText>
          </View>
        </View>
        <View style={[styles.sensors, { backgroundColor: 'rgba(46,125,51,0.12)' }]}>
          <Icon name="sensor" size={14} color={colors.statusSuccess} />
          <AppText variant="tiny" weight="semibold" tone="success">
            {t.parking.liveSensors}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" tone="secondary" style={styles.tight}>
        {t.parking.freeSub}
      </AppText>

      <View
        style={[
          styles.summary,
          { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
        ]}
      >
        <AppText size={26} weight="bold" tone="success" style={{ letterSpacing: -0.52 }}>
          {freeNow}
        </AppText>
        <AppText variant="captionStrong" tone="secondary" style={styles.flex}>
          {t.parking.freeNow}
        </AppText>
        <AppText variant="tiny" weight="regular" tone="secondary">
          {t.parking.updated}
        </AppText>
      </View>

      {freeZones.map((z) => (
        <ZoneCard key={z.id} zone={z} />
      ))}
    </Screen>
  );
}

function ZoneCard({ zone }: { zone: FreeZone }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const alerts = spotAlerts.use();
  const status = zoneStatus(zone);
  const fill = (zone.total - zone.free) / zone.total;
  const barColor = {
    available: colors.statusSuccess,
    almostFull: colors.brandPrimary,
    full: colors.statusError,
  }[status];
  const alertOn = alerts.includes(zone.id);

  return (
    <Card style={styles.zone}>
      <View style={styles.between}>
        <View style={styles.flex}>
          <AppText variant="bodySmall" weight="semibold">
            {zone.name[language]}
          </AppText>
          <AppText variant="tiny" weight="regular" tone="secondary">
            {zone.near[language]}
          </AppText>
        </View>
        {status === 'available' && <Chip label={t.parking.available} tone="successSoft" dot />}
        {status === 'almostFull' && <Chip label={t.parking.almostFull} />}
        {status === 'full' && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: alertOn }}
            onPress={() => {
              if (alertOn) {
                spotAlerts.set((p) => p.filter((id) => id !== zone.id));
                return;
              }
              spotAlerts.set((p) => [...p, zone.id]);
              toast.show({
                emoji: '🅿️',
                title: t.parking.alertTitle,
                body: fmt(t.parking.alertBody, { zone: zone.name[language] }),
              });
            }}
            style={[
              styles.alert,
              alertOn
                ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                : { backgroundColor: colors.backgroundPrimary, borderColor: colors.brandPrimary },
            ]}
          >
            <Icon name="bellPlus" size={14} color={alertOn ? '#FFFFFF' : colors.brandPrimary} />
            <AppText variant="caption" weight="semibold" tone={alertOn ? 'onBrand' : 'brand'}>
              {alertOn ? t.parking.alertOn : t.parking.alertMe}
            </AppText>
          </Pressable>
        )}
      </View>
      <View style={[styles.bar, { height: 6, backgroundColor: colors.borderDefault }]}>
        <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.between}>
        <View style={styles.row}>
          <Icon name="clock" size={12} color={colors.textSecondary} />
          <AppText variant="tiny" tone="secondary">
            {zone.hint[language]}
          </AppText>
        </View>
        <AppText variant="caption" weight="semibold">
          {fmt(t.parking.freeOf, { free: zone.free, total: zone.total })}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  white: { color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  paid: { borderRadius: 20, padding: 18, gap: 12 },
  pIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 4,
  },
  price: { alignItems: 'flex-end' },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bar: { borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  sectionTop: { marginTop: 24 },
  tight: { marginTop: -10 },
  freeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sensors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingStart: 8,
    paddingEnd: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  zone: { gap: 7, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
