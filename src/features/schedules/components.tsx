import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { fmt, useI18n } from '@/i18n';
import { formatTime, toMinutes } from '@/services/clock';
import {
  nextHours,
  notifyInstructors,
  todayHours,
  type Instructor,
  type SlotType,
} from '@/services/schedules';
import { useTheme } from '@/theme';
import { initials } from '@/utils/format';

/** "11:00" → "11:00" (no suffix) / with suffix when `suffix`. Drops leading zero like Figma. */
export function clock(hhmm: string, language: 'en' | 'ar', suffix = false) {
  const s = formatTime(toMinutes(hhmm), language).replace(/^0/, '');
  return suffix ? s : s.replace(/ (AM|PM|ص|م)$/, '');
}

/** "Today · 11:00 – 12:30 PM" or "Next: Thu · 10:00 AM". */
export function ohLabel(i: Instructor, t: ReturnType<typeof useI18n>['t'], language: 'en' | 'ar') {
  const today = todayHours(i);
  if (today) {
    return fmt(t.schedules.today, {
      start: clock(today.start, language),
      end: clock(today.end, language, true),
    });
  }
  const next = nextHours(i);
  return fmt(t.schedules.next, {
    day: t.schedules.days[next.day],
    time: clock(next.start, language, true),
  });
}

/** Circular initials avatar (surface fill, brand initials). */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const { language } = useI18n();
  // Arabic names use the first letter of the given name, as in Figma (e.g. "س").
  const label =
    language === 'ar'
      ? name.replace(/^د\.\s*/, '').charAt(0)
      : initials(name.replace(/^Dr\.\s*/, ''));
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.backgroundSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <AppText size={size * 0.29} weight="semibold" tone="brand">
        {label}
      </AppText>
    </View>
  );
}

/** Figma Button/NotifyMe: outlined orange when off, solid orange when on. */
export function NotifyButton({ instructorId }: { instructorId: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const on = notifyInstructors.use().includes(instructorId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={6}
      onPress={() => {
        notifyInstructors.toggle(instructorId);
        if (!on)
          toast.show({ emoji: '🔔', title: t.schedules.notifyTitle, body: t.schedules.notifyBody });
      }}
      style={[
        styles.notify,
        {
          borderColor: colors.brandPrimary,
          backgroundColor: on ? colors.brandPrimary : colors.brandPrimarySoft,
        },
      ]}
    >
      <Icon name="bellPlus" size={14} color={on ? '#FFFFFF' : colors.brandPrimary} />
      <AppText variant="tiny" weight="semibold" tone={on ? 'onBrand' : 'brand'}>
        {on ? t.schedules.notifyOn : t.schedules.notifyMe}
      </AppText>
    </Pressable>
  );
}

/** Colours for timetable slot types (Figma 03.1 slot rows). */
export function useSlotLook() {
  const { colors, isDark } = useTheme();
  return (type: SlotType) => {
    if (type === 'CLS') return { bg: isDark ? '#3A2818' : '#FCEDDE', accent: colors.brandPrimary };
    if (type === 'OH') return { bg: isDark ? '#17301C' : '#E5F5E5', accent: colors.statusSuccess };
    return { bg: colors.backgroundSurface, accent: colors.textSecondary };
  };
}

const styles = StyleSheet.create({
  avatar: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingStart: 10,
    paddingEnd: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
});
