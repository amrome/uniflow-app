import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Card, Screen, TopBar } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { fmt, useI18n } from '@/i18n';
import { formatTime, nowMinutes, toMinutes } from '@/services/clock';
import { nextIndex, shuttleTimetable } from '@/services/transport';
import { useTheme } from '@/theme';

// Figma 11.2 · Shuttle Schedule (+ Reminder Set state and Toast/ShuttleReminder)
export default function ShuttleSchedule() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const [reminder, setReminder] = useState(false);
  const shuttleTimes = shuttleTimetable.use();

  const nextFrom = nextIndex('fromCampus', shuttleTimes);
  const nextTo = nextIndex('toCampus', shuttleTimes);
  const nextTime = nextFrom >= 0 ? toMinutes(shuttleTimes.fromCampus[nextFrom]) : null;

  const toggleReminder = (on: boolean) => {
    setReminder(on);
    if (on && nextTime !== null) {
      toast.show({
        emoji: '🚌',
        title: t.transport.reminderToastTitle,
        body: fmt(t.transport.reminderToastBody, { time: formatTime(nextTime, language) }),
      });
    }
  };

  const cell = (time: string | undefined, isNext: boolean) => {
    if (!time) return <View style={styles.cell} />;
    const past = toMinutes(time) < nowMinutes();
    return (
      <View
        style={[styles.cell, isNext && { backgroundColor: 'rgba(246,137,56,0.12)' }]}
        key={time}
      >
        <AppText
          variant="bodyStrong"
          weight={isNext ? 'bold' : 'semibold'}
          tone={past ? 'secondary' : 'primary'}
        >
          {formatTime(toMinutes(time), language)}
        </AppText>
        {isNext && (
          <View style={[styles.next, { backgroundColor: colors.brandPrimary }]}>
            <AppText size={9} weight="bold" tone="onBrand">
              {t.transport.next}
            </AppText>
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen header={<TopBar title={t.transport.scheduleTitle} />} gap={12}>
      <Card style={styles.route}>
        <View style={[styles.routeIcon, { backgroundColor: colors.brandPrimary }]}>
          <Icon name="bus" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{t.transport.routeBoth}</AppText>
          <AppText variant="caption" tone="secondary">
            {t.transport.days}
          </AppText>
        </View>
      </Card>

      <View style={[styles.table, { borderColor: colors.borderDefault }]}>
        <View style={[styles.row, { backgroundColor: colors.inkPrimary }]}>
          {(
            [
              [t.transport.uniToMetro, t.transport.fromCampus],
              [t.transport.metroToUni, t.transport.toCampus],
            ] as const
          ).map(([title, sub]) => (
            <View key={title} style={styles.head}>
              <AppText variant="label" style={{ color: '#FFFFFF' }}>
                {title}
              </AppText>
              <AppText variant="tiny" tone="brand">
                {sub}
              </AppText>
            </View>
          ))}
        </View>
        {Array.from(
          { length: Math.max(shuttleTimes.fromCampus.length, shuttleTimes.toCampus.length) },
          (_, i) => (
            <View
              key={i}
              style={[styles.row, styles.divider, { borderColor: colors.borderDefault }]}
            >
              {cell(shuttleTimes.fromCampus[i], i === nextFrom)}
              {cell(shuttleTimes.toCampus[i], i === nextTo)}
            </View>
          ),
        )}
      </View>

      <View style={[styles.note, { backgroundColor: 'rgba(246,137,56,0.1)' }]}>
        <Icon name="briefcase" size={16} color={colors.brandPrimary} />
        <AppText variant="captionStrong" style={styles.flex}>
          {t.transport.adminNote}
        </AppText>
      </View>

      <View
        style={[
          styles.reminder,
          { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
        ]}
      >
        <AppText variant="headingSmall" style={styles.flex}>
          {reminder && nextTime !== null
            ? fmt(t.transport.reminderOn, { time: formatTime(nextTime - 10, language) })
            : t.transport.remindMe}
        </AppText>
        <Switch
          value={reminder}
          onValueChange={toggleReminder}
          trackColor={{ true: colors.brandPrimary, false: colors.borderDefault }}
          thumbColor="#FFFFFF"
          accessibilityLabel={t.transport.remindMe}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  divider: { borderTopWidth: 1 },
  head: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 1 },
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
  },
  next: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
