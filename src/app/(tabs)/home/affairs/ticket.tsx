import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, ConfirmDialog, Screen, TopBar } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { affairsServices, cancelTicket, ticket } from '@/services/affairs';
import { formatTime } from '@/services/clock';
import { useTheme } from '@/theme';

// Figma 10.1 · Your Ticket (+ Popup/CancelBooking)
export default function YourTicket() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const tk = ticket.useValue();
  const [confirming, setConfirming] = useState(false);
  if (!tk) return null;
  const service = affairsServices.find((s) => s.id === tk.serviceId);

  return (
    <Screen
      header={<TopBar title={t.affairs.ticketTitle} />}
      footer={
        <Button label={t.affairs.cancel} variant="secondary" onPress={() => setConfirming(true)} />
      }
      gap={16}
    >
      <View style={[styles.ticket, { backgroundColor: colors.brandPrimary }]}>
        <AppText variant="label" weight="medium" tone="onBrand">
          {service?.name[language]}
        </AppText>
        <AppText variant="tiny" weight="bold" tone="onBrand">
          {t.affairs.yourNumberCaps}
        </AppText>
        <AppText size={52} weight="bold" tone="onBrand" style={{ letterSpacing: -1.04 }}>
          {tk.number}
        </AppText>
        <View style={[styles.serving, { backgroundColor: colors.backgroundPrimary }]}>
          <View style={[styles.dot, { backgroundColor: colors.statusSuccess }]} />
          <AppText variant="caption" weight="semibold">
            {fmt(t.affairs.nowServing, { number: tk.nowServing })}
          </AppText>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={String(tk.ahead)} label={t.affairs.ahead} />
        <Stat value={fmt(t.affairs.minutes, { n: tk.waitMin })} label={t.affairs.estWait} />
        <Stat value={formatTime(tk.at, language).replace(/^0/, '')} label={t.affairs.estTime} />
      </View>

      <View style={styles.progress}>
        <View style={styles.between}>
          <AppText variant="label">{t.affairs.progress}</AppText>
          <AppText variant="caption" tone="secondary">
            {fmt(t.affairs.served, { served: tk.served, total: tk.total })}
          </AppText>
        </View>
        <View style={[styles.bar, { backgroundColor: colors.borderDefault }]}>
          <View
            style={[
              styles.fill,
              { width: `${(tk.served / tk.total) * 100}%`, backgroundColor: colors.brandPrimary },
            ]}
          />
        </View>
      </View>

      <View style={[styles.office, { borderColor: colors.borderDefault }]}>
        <Icon name="pin" size={22} color={colors.brandPrimary} />
        <View>
          <AppText variant="bodySmall" weight="semibold">
            {t.affairs.office}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t.affairs.officeWhere}
          </AppText>
        </View>
      </View>

      <AppText variant="bodyStrong">{t.affairs.notifications}</AppText>
      <View style={styles.alerts}>
        <AlertRow
          title={t.affairs.alertNear}
          sub={t.affairs.alertNearSub}
          value={tk.alertNear}
          onChange={(v) => ticket.set((p) => p && { ...p, alertNear: v })}
        />
        <AlertRow
          title={t.affairs.alertTurn}
          sub={t.affairs.alertTurnSub}
          value={tk.alertTurn}
          onChange={(v) => ticket.set((p) => p && { ...p, alertTurn: v })}
        />
      </View>

      <ConfirmDialog
        visible={confirming}
        title={t.affairs.cancelTitle}
        body={fmt(t.affairs.cancelBody, { number: tk.number })}
        keepLabel={t.affairs.keep}
        confirmLabel={t.affairs.confirmCancel}
        onKeep={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          router.back();
          cancelTicket();
        }}
      />
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.backgroundSurface }]}>
      <AppText variant="title" weight="bold" size={18}>
        {value}
      </AppText>
      <AppText variant="tiny" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

function AlertRow(props: {
  title: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.alert, { backgroundColor: colors.backgroundSurface }]}>
      <Icon name="bellPlus" size={20} color={colors.brandPrimary} />
      <View style={styles.flex}>
        <AppText variant="bodySmall" weight="semibold">
          {props.title}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {props.sub}
        </AppText>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ true: colors.brandPrimary, false: colors.borderDefault }}
        thumbColor="#FFFFFF"
        accessibilityLabel={props.title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticket: {
    borderRadius: 22,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 14,
  },
  serving: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12 },
  progress: { gap: 8 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  office: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alerts: { gap: 8, marginTop: -8 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
