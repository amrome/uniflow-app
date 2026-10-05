// Bottom sheet that appears when a vehicle marker is tapped on the 3D map. Shows the vehicle's
// name, status, ETA, and action buttons: notify when near, track on map, share ETA, report issue.

import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { AppText, Button } from '@/components/ui';
import { PressableScale } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { fmt, useI18n } from '@/i18n';
import { useTheme } from '@/theme';

import type { Vehicle } from './vehicleTracking';

type Props = {
  vehicle: Vehicle;
  onClose: () => void;
};

type Action = {
  icon: IconName;
  labelKey: 'notifyNearAction' | 'trackAction' | 'shareEtaAction' | 'reportAction';
  key: string;
};

const ACTIONS: Action[] = [
  { icon: 'bell', labelKey: 'notifyNearAction', key: 'notify' },
  { icon: 'pin', labelKey: 'trackAction', key: 'track' },
  { icon: 'link', labelKey: 'shareEtaAction', key: 'share' },
  { icon: 'help', labelKey: 'reportAction', key: 'report' },
];

export function VehicleSheet({ vehicle, onClose }: Props) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();

  const statusLabel =
    vehicle.status === 'stopped'
      ? t.transport.vehicleStopped
      : vehicle.status === 'arriving'
        ? t.transport.vehicleArriving
        : t.transport.vehicleMoving;

  const statusColor =
    vehicle.status === 'stopped' ? '#888' : vehicle.status === 'arriving' ? '#2E7D33' : vehicle.color;

  const handleAction = (key: string) => {
    switch (key) {
      case 'notify':
        toast.show({
          emoji: vehicle.type === 'bus' ? '🚌' : '🛺',
          title: t.transport.notifyToastTitle,
          body: fmt(t.transport.notifyWhenNearBody, { name: vehicle.name[language] }),
        });
        break;
      case 'track':
        toast.show({
          emoji: '📍',
          title: t.transport.trackingToastTitle,
          body: fmt(t.transport.trackingToastBody, { name: vehicle.name[language] }),
        });
        break;
      case 'share':
        toast.show({
          emoji: '🔗',
          title: t.transport.shareToastTitle,
          body: t.transport.shareToastBody,
        });
        break;
      case 'report':
        toast.show({
          emoji: '⚠️',
          title: t.transport.reportToastTitle,
          body: t.transport.reportToastBody,
        });
        break;
    }
  };

  return (
    <View style={[styles.sheet, { backgroundColor: colors.backgroundPrimary }]}>
      <View style={[styles.grabber, { backgroundColor: colors.borderDefault }]} />

      {/* Header: emoji, name, close */}
      <View style={styles.header}>
        <View style={[styles.vehicleIcon, { backgroundColor: vehicle.color }]}>
          <AppText size={18}>{vehicle.type === 'bus' ? '🚌' : '🛺'}</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" weight="bold">
            {vehicle.name[language]}
          </AppText>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <AppText variant="caption" tone="secondary">
              {statusLabel}
            </AppText>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="✕" hitSlop={10} onPress={onClose}>
          <AppText variant="body" tone="secondary">
            ✕
          </AppText>
        </Pressable>
      </View>

      {/* Info row: ETA + location */}
      <View style={[styles.infoRow, { backgroundColor: colors.backgroundSurface }]}>
        <View style={styles.infoBlock}>
          <AppText variant="tiny" tone="secondary">
            {t.transport.etaLabel}
          </AppText>
          <AppText variant="title" weight="bold" tone="brand">
            {fmt(t.transport.minutesAway, { n: vehicle.etaMin })}
          </AppText>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: colors.borderDefault }]} />
        <View style={[styles.infoBlock, styles.flex]}>
          <AppText variant="tiny" tone="secondary">
            {t.transport.locationLabel}
          </AppText>
          <AppText variant="bodySmall" weight="semibold">
            {vehicle.near[language]}
          </AppText>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {ACTIONS.map((a) => (
          <PressableScale
            key={a.key}
            accessibilityRole="button"
            onPress={() => handleAction(a.key)}
            style={[styles.actionBtn, { backgroundColor: colors.backgroundSurface }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.brandPrimary + '18' }]}>
              <Icon name={a.icon} size={18} color={colors.brandPrimary} />
            </View>
            <AppText variant="tiny" weight="semibold" style={styles.actionLabel}>
              {t.transport[a.labelKey]}
            </AppText>
          </PressableScale>
        ))}
      </View>

      {/* Primary CTA */}
      <Button
        label={t.transport.notifyNear}
        onPress={() => handleAction('notify')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
    boxShadow: '0px -4px 16px 0px rgba(0,0,0,0.1)',
  },
  grabber: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
  },
  infoBlock: { gap: 2 },
  infoDivider: { width: 1, height: 36, marginHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { textAlign: 'center' },
});
