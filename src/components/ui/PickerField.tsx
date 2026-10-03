import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n';
import { layout, radius, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  label?: string;
  /** Text shown in the field. */
  display: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (d: Date) => void;
  compact?: boolean;
  required?: boolean;
};

/** Field styled like Input/Field that opens the native date or time picker. */
export function PickerField({ label, display, value, mode, onChange, compact, required }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const show = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: false,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onChange(d);
        },
      });
      return;
    }
    setDraft(value);
    setOpen(true);
  };

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      {label && (
        <AppText variant="captionStrong" tone="secondary">
          {label}
          {required && <AppText style={{ color: colors.statusError }}> *</AppText>}
        </AppText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${display}` : display}
        onPress={show}
        style={[
          styles.field,
          compact && styles.fieldCompact,
          { backgroundColor: colors.backgroundPrimary, borderColor: colors.borderDefault },
        ]}
      >
        <AppText variant={compact ? 'bodyStrong' : 'body'}>{display}</AppText>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable
              style={[styles.sheet, { backgroundColor: colors.backgroundPrimary }]}
              onPress={() => {}}
            >
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_, d) => d && setDraft(d)}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                style={[styles.done, { backgroundColor: colors.brandPrimary }]}
              >
                <AppText variant="headingSmall" tone="onBrand">
                  {t.common.done}
                </AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

/** "13:30" ⇄ Date helpers for time pickers. */
export function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function dateToHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  wrap: { gap: 6, flex: 1 },
  compact: { flex: 0 },
  field: {
    height: layout.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  fieldCompact: {
    height: undefined,
    borderWidth: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 36,
    gap: 8,
  },
  done: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
