import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { DialogIn } from './Reveal';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  keepLabel: string;
  confirmLabel: string;
  onKeep: () => void;
  onConfirm: () => void;
  /** Glyph in the round badge; Figma uses ⚠ for destructive actions. */
  icon?: string;
};

/** Figma Popup/CancelBooking: dimmed backdrop, 20px-radius dialog, keep + destructive buttons. */
export function ConfirmDialog({
  visible,
  title,
  body,
  keepLabel,
  confirmLabel,
  onKeep,
  onConfirm,
  icon = '⚠',
}: Props) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeep}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onKeep}
        accessibilityRole="button"
        accessibilityLabel={keepLabel}
      >
        <DialogIn style={styles.dialogWrap}>
          <Pressable
            style={[styles.dialog, { backgroundColor: colors.backgroundPrimary }]}
            onPress={() => {}}
          >
            <View style={[styles.badge, { backgroundColor: 'rgba(214,69,69,0.12)' }]}>
              <AppText size={30} tone="error">
                {icon}
              </AppText>
            </View>
            <AppText variant="headingLarge" align="center">
              {title}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center" style={styles.body}>
              {body}
            </AppText>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onKeep}
                style={[styles.btn, { backgroundColor: colors.backgroundSurface }]}
              >
                <AppText variant="bodyStrong">{keepLabel}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onConfirm}
                style={[styles.btn, { backgroundColor: colors.statusError }]}
              >
                <AppText variant="bodyStrong" tone="onBrand">
                  {confirmLabel}
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
    padding: 40,
  },
  dialogWrap: { width: '100%', maxWidth: 360 },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 30,
    paddingBottom: 4,
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
  body: { maxWidth: 300 },
  actions: { alignSelf: 'stretch', marginTop: 8, marginBottom: 26, gap: 0 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
