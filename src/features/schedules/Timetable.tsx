import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useI18n } from '@/i18n';
import { weekDays, type Slot, type WeekDay } from '@/services/schedules';
import { useTheme } from '@/theme';

import { clock, useSlotLook } from './components';

/** Sun–Thu segmented tabs (Figma DayTabs). */
export function DayTabs({ value, onChange }: { value: WeekDay; onChange: (d: WeekDay) => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.days}>
      {weekDays.map((d) => {
        const on = d === value;
        return (
          <Pressable
            key={d}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(d)}
            style={[
              styles.day,
              on
                ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                : { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
            ]}
          >
            <AppText variant="label" tone={on ? 'onBrand' : 'secondary'} numberOfLines={1}>
              {t.schedules.days[d]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One timetable block: accent bar, start/end, title + room, type chip. */
export function SlotRow({
  slot,
  onPress,
  editable,
}: {
  slot: Slot;
  onPress?: () => void;
  editable?: boolean;
}) {
  const { language } = useI18n();
  const { colors } = useTheme();
  const look = useSlotLook()(slot.type);
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.slot, { backgroundColor: look.bg, borderColor: colors.borderDefault }]}
    >
      <View style={[styles.accent, { backgroundColor: look.accent }]} />
      <View style={styles.times}>
        <AppText variant="tiny" weight="semibold" tone="secondary">
          {clock(slot.start, language)}
        </AppText>
        <AppText size={10} weight="regular" tone="secondary">
          {clock(slot.end, language)}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="caption" weight="semibold" numberOfLines={1}>
          {slot.title[language]}
        </AppText>
        <AppText size={10} weight="regular" tone="secondary" numberOfLines={1}>
          {slot.room[language]}
        </AppText>
      </View>
      <View style={[styles.typeChip, { backgroundColor: look.accent }]}>
        <AppText size={9} weight="bold" tone="onBrand" align="center">
          {slot.type}
        </AppText>
      </View>
      {editable && (
        <AppText variant="bodySmall" tone="secondary">
          ✎
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  days: { flexDirection: 'row', gap: 8, marginTop: -4 },
  day: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingEnd: 12,
    overflow: 'hidden',
  },
  accent: { width: 4, height: 30, borderRadius: 2 },
  times: { width: 38 },
  typeChip: { width: 34, height: 20, borderRadius: 6, justifyContent: 'center' },
});
