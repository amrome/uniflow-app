import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, Card, Chip, Screen, TopBar } from '@/components/ui';
import { PressableScale } from '@/components/ui/PressableScale';
import { fmt, useI18n } from '@/i18n';
import {
  nearestFreeBay,
  simulateSensors,
  spotAlerts,
  useFreeZone,
  useZoneBays,
  zoneStatus,
  type Bay,
} from '@/services/parking';
import { useTheme } from '@/theme';

/** Bays per row on the drawn lot plan. */
const PER_ROW = 10;
const GAP = 4;

// Free parking zone map (no Figma frame yet): every bay numbered and coloured by its sensor.
// The lot is drawn as a plan: pairs of bay rows face a driving lane, bay 1 is next to the entrance.
export default function ParkingZone() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const zone = useFreeZone(id);
  const bays = useZoneBays(id);
  const alerts = spotAlerts.useValue();
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => (id ? simulateSensors(id) : undefined), [id]);

  if (!zone) return null;

  const free = bays.length ? bays.filter((b) => b.active && !b.occupied).length : zone.free;
  const total = bays.length || zone.total;
  const status = zoneStatus({ ...zone, free, total });
  const nearest = nearestFreeBay(bays);
  const picked = bays.find((b) => b.number === selected);
  const alertOn = alerts.includes(zone.id);
  const rows: Bay[][] = [];
  for (let i = 0; i < bays.length; i += PER_ROW) rows.push(bays.slice(i, i + PER_ROW));
  const bay = width ? Math.floor((width - GAP * (PER_ROW - 1)) / PER_ROW) : 0;

  const stateOf = (b: Bay) =>
    !b.active
      ? t.parking.zone.bayClosed
      : b.occupied
        ? t.parking.zone.bayTaken
        : t.parking.zone.bayFree;
  const colorOf = (b: Bay) =>
    !b.active ? colors.borderDefault : b.occupied ? colors.statusError : colors.statusSuccess;
  const countColor = free === 0 ? colors.statusError : colors.statusSuccess;

  return (
    <Screen header={<TopBar title={zone.name[language]} />} gap={12}>
      <Card style={styles.hero}>
        <View style={styles.between}>
          <View style={styles.count}>
            <AppText size={34} weight="bold" style={{ color: countColor, letterSpacing: -0.7 }}>
              {free}
            </AppText>
            <AppText variant="bodySmall" weight="medium" tone="secondary">
              {fmt(t.parking.zone.freeOfTotal, { total })}
            </AppText>
          </View>
          {status === 'available' && <Chip label={t.parking.available} tone="successSoft" dot />}
          {status === 'almostFull' && <Chip label={t.parking.almostFull} />}
          {status === 'full' && <Chip label={t.parking.zone.noneFree} tone="error" />}
        </View>
        <View style={styles.row}>
          <Icon name="pin" size={13} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary" style={styles.flex}>
            {zone.near[language]}
          </AppText>
          <View style={[styles.sensors, { backgroundColor: 'rgba(46,125,51,0.12)' }]}>
            <Icon name="sensor" size={13} color={colors.statusSuccess} />
            <AppText variant="tiny" weight="semibold" tone="success">
              {t.parking.liveSensors}
            </AppText>
          </View>
        </View>
      </Card>

      {nearest ? (
        <View
          style={[
            styles.nearest,
            { backgroundColor: colors.brandPrimarySoft, borderColor: colors.brandPrimary },
          ]}
        >
          <View style={styles.flex}>
            <AppText variant="label" tone="brand">
              {t.parking.zone.nearest}
            </AppText>
            <AppText variant="headingSmall">
              {fmt(t.parking.zone.nearestBody, { n: nearest.label })}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelected(nearest.number)}
            style={[styles.show, { backgroundColor: colors.brandPrimary }]}
          >
            <AppText variant="bodySmall" weight="semibold" tone="onBrand">
              {t.parking.zone.show}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <Card tone="surface" style={styles.gap8}>
          <AppText variant="bodyStrong">{t.parking.zone.noneFree}</AppText>
          <AppText variant="caption" tone="secondary">
            {t.parking.zone.noneFreeBody}
          </AppText>
          <Button
            label={alertOn ? t.parking.alertOn : t.parking.alertMe}
            icon="bellPlus"
            variant={alertOn ? 'primary' : 'secondary'}
            onPress={() => spotAlerts.toggle(zone.id)}
          />
        </Card>
      )}

      <View style={styles.legend}>
        <Legend color={colors.statusSuccess} label={t.parking.zone.legendFree} />
        <Legend color={colors.statusError} label={t.parking.zone.legendTaken} />
        <Legend color={colors.borderDefault} label={t.parking.zone.legendClosed} />
      </View>

      <Card style={styles.mapCard}>
        <ScrollView
          maximumZoomScale={3}
          minimumZoomScale={1}
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* The lot is a physical place: it never mirrors in Arabic. */}
          <View
            style={styles.ltr}
            onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          >
            <View style={[styles.entrance, { backgroundColor: colors.inkPrimary }]}>
              <AppText variant="captionStrong" style={styles.white}>
                ↓ {t.parking.zone.entrance} · {zone.near[language]}
              </AppText>
            </View>
            {bay > 0 &&
              rows.map((row, r) => (
                <View key={r}>
                  <View style={styles.bayRow}>
                    {row.map((b) => {
                      const on = b.number === selected;
                      return (
                        <Pressable
                          key={b.label}
                          accessibilityRole="button"
                          accessibilityLabel={fmt(t.parking.zone.a11yBay, {
                            n: b.number,
                            state: stateOf(b),
                          })}
                          accessibilityState={{ selected: on }}
                          onPress={() => setSelected(on ? null : b.number)}
                          style={[
                            styles.bay,
                            {
                              width: bay,
                              height: Math.round(bay * 1.45),
                              backgroundColor: colorOf(b),
                            },
                            // bays in the first row of a pair face the lane below, the second above
                            r % 2 === 0 ? styles.faceDown : styles.faceUp,
                            on && { borderColor: colors.brandPrimary, borderWidth: 3 },
                          ]}
                        >
                          <AppText
                            size={bay < 30 ? 10 : 12}
                            weight="bold"
                            style={b.active ? styles.white : { color: colors.textSecondary }}
                          >
                            {b.number}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {r < rows.length - 1 &&
                    (r % 2 === 0 ? (
                      <View style={[styles.lane, { backgroundColor: colors.backgroundSurface }]}>
                        <View style={[styles.laneLine, { borderColor: colors.textSecondary }]} />
                      </View>
                    ) : (
                      <View style={[styles.curb, { backgroundColor: colors.borderDefault }]} />
                    ))}
                </View>
              ))}
          </View>
        </ScrollView>
      </Card>

      <View style={[styles.info, { backgroundColor: colors.backgroundSurface }]}>
        {picked ? (
          <>
            <View style={[styles.infoDot, { backgroundColor: colorOf(picked) }]} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {fmt(t.parking.zone.bay, { n: picked.label })} ·{' '}
              {fmt(t.parking.zone.row, { n: Math.ceil(picked.number / PER_ROW) })}
            </AppText>
            <AppText
              variant="bodySmall"
              weight="semibold"
              tone={!picked.active ? 'secondary' : picked.occupied ? 'error' : 'success'}
            >
              {stateOf(picked)}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" tone="secondary">
            {t.parking.zone.tapHint}
          </AppText>
        )}
      </View>
      <AppText variant="tiny" weight="regular" tone="secondary">
        {t.parking.zone.sensorNote}
      </AppText>

      <Card style={styles.locationCard}>
        <View style={styles.between}>
          <AppText variant="bodyStrong" weight="bold">
            {t.parking.zone.locationTitle}
          </AppText>
          <PressableScale
            accessibilityRole="button"
            onPress={() =>
              Linking.openURL(
                `https://maps.google.com/?q=${encodeURIComponent(zone.name.en + ', Al Yamamah University, Riyadh')}`,
              ).catch(() => {})
            }
            style={[styles.dirBtn, { backgroundColor: colors.brandPrimary }]}
          >
            <AppText variant="caption" weight="semibold" tone="onBrand">
              📍 {t.parking.zone.directions}
            </AppText>
          </PressableScale>
        </View>
        <View style={styles.row}>
          <Icon name="pin" size={14} color={colors.textSecondary} />
          <AppText variant="bodySmall" tone="secondary">
            {zone.near[language]}
          </AppText>
        </View>
        <AppText variant="caption" tone="secondary">
          {zone.hint[language]}
        </AppText>
        <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />
        <InfoRow label={t.parking.zone.hours} value={t.parking.zone.hoursValue} />
        <InfoRow label={t.parking.zone.surface} value={t.parking.zone.surfaceValue} />
        <InfoRow label={t.parking.zone.lighting} value={t.parking.zone.lightingValue} />
        <InfoRow label={t.parking.zone.cctv} value={t.parking.zone.cctvValue} />
      </Card>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="caption" weight="semibold" style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="caption" tone="secondary" style={styles.flex}>
        {value}
      </AppText>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <AppText variant="caption" weight="medium">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  white: { color: '#FFFFFF' },
  ltr: { direction: 'ltr' },
  gap8: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hero: { gap: 8, borderRadius: 18 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  sensors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  nearest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  show: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  legend: { flexDirection: 'row', gap: 16, paddingHorizontal: 2 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  mapCard: { padding: 10, borderRadius: 18 },
  entrance: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  bayRow: { flexDirection: 'row', gap: GAP },
  bay: { borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  faceDown: { borderBottomWidth: 3, borderBottomColor: 'rgba(255,255,255,0.6)' },
  faceUp: { borderTopWidth: 3, borderTopColor: 'rgba(255,255,255,0.6)' },
  lane: { height: 26, marginVertical: 4, borderRadius: 6, justifyContent: 'center' },
  laneLine: { marginHorizontal: 10, borderTopWidth: 2, borderStyle: 'dashed', opacity: 0.5 },
  curb: { height: 6, marginVertical: 8, borderRadius: 3 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  infoDot: { width: 14, height: 14, borderRadius: 7 },
  locationCard: { gap: 8, borderRadius: 18, marginTop: 8 },
  dirBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  divider: { height: 1, marginVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoLabel: { width: 80 },
});
