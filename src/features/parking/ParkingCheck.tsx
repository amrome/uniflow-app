import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { DialogIn } from '@/components/ui/Reveal';
import { useToast } from '@/components/ui/Toast';
import { fmt, useI18n } from '@/i18n';
import { formatTime } from '@/services/clock';
import { reportError } from '@/services/errors';
import {
  cancelReservation,
  confirmReservation,
  needsCheck,
  parkingNow,
  passOnScreen,
  reservation,
  type Reservation,
} from '@/services/parking';
import { createStore } from '@/services/store';
import { useTheme } from '@/theme';

/** Reservation numbers whose "still coming?" pop-up was closed without an answer (this run). */
const dismissed = createStore<readonly string[]>([]);

/** Confirm / cancel with the matching toast. Shared by the pop-up and the parking pass. */
export function useParkingAnswer() {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const methodName = (r: Reservation) =>
    ({ applePay: t.parking.applePay, mada: t.parking.mada, stcPay: t.parking.stcPay })[r.method];

  const confirm = (r: Reservation) => {
    confirmReservation();
    toast.show({
      emoji: '🅿️',
      title: t.parking.check.confirmedTitle,
      body: fmt(t.parking.check.confirmedBody, { slot: r.slot }),
    });
  };

  const cancel = async (r: Reservation) => {
    setBusy(true);
    try {
      await cancelReservation();
      toast.show({
        emoji: '💸',
        title: t.parking.check.refundTitle,
        body: fmt(t.parking.check.refundBody, {
          amount: fmt(t.food.price, { n: r.amount }),
          method: methodName(r),
          slot: r.slot,
        }),
      });
      return true;
    } catch (e) {
      reportError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { confirm, cancel, busy };
}

/**
 * "Are you still coming?" — pops up on any tab from 30 minutes before the arrival time until the
 * student answers. Closing it without answering asks again next time the app opens.
 */
export function ParkingCheck() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const r = reservation.useValue();
  const closed = dismissed.useValue();
  const { confirm, cancel, busy } = useParkingAnswer();
  const onPass = passOnScreen.useValue();
  const [now, setNow] = useState(parkingNow);

  // Re-check every half minute so the question appears on time while the app stays open.
  useEffect(() => {
    const id = setInterval(() => setNow(parkingNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  const key = r?.number ?? r?.slot ?? '';
  const visible = needsCheck(r, now) && !closed.includes(key) && !onPass;
  if (!r) return null;
  const close = () => dismissed.set((prev) => [...prev, key]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button">
        <DialogIn style={styles.wrap}>
          <Pressable
            style={[styles.dialog, { backgroundColor: colors.backgroundPrimary }]}
            onPress={() => {}}
          >
            <View style={[styles.badge, { backgroundColor: colors.brandPrimarySoft }]}>
              <AppText size={30}>🅿️</AppText>
            </View>
            <AppText variant="headingLarge" align="center">
              {t.parking.check.title}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              {fmt(t.parking.check.body, {
                slot: r.slot,
                time: formatTime(r.arriveAt, language),
                amount: fmt(t.food.price, { n: r.amount }),
              })}
            </AppText>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => confirm(r)}
                style={[styles.btn, { backgroundColor: colors.statusSuccess }]}
              >
                <AppText variant="bodyStrong" tone="onBrand">
                  {t.parking.check.yes}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => cancel(r)}
                style={[styles.btn, { borderColor: colors.statusError, borderWidth: 1.5 }]}
              >
                <AppText variant="bodyStrong" tone="error">
                  {t.parking.check.cancel}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </DialogIn>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  wrap: { width: '100%', maxWidth: 360 },
  dialog: {
    width: '100%',
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 26,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { alignSelf: 'stretch', marginTop: 8, gap: 10 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
