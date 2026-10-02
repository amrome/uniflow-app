import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icons';
import {
  AppText,
  Button,
  LangToggle,
  PickerField,
  Screen,
  TopBar,
  dateToHhmm,
  hhmmToDate,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { formatTime, toMinutes } from '@/services/clock';
import { reportError } from '@/services/errors';
import {
  saveTimetable,
  shuttleTimetable,
  type Direction,
  type Timetable,
} from '@/services/transport';
import { useTheme } from '@/theme';

// Figma 13.5 · Schedule Editor (Edit Shuttle Schedule)
export default function ShuttleEditor() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [table, setTable] = useState<Timetable>(() => shuttleTimetable.get());
  const [direction, setDirection] = useState<Direction>('fromCampus');
  const [notify, setNotify] = useState(true);
  const times = table[direction];

  const update = (next: string[]) => setTable((tb) => ({ ...tb, [direction]: [...next].sort() }));

  return (
    <Screen
      header={<TopBar title={t.staffPortal.shuttleEditorTitle} right={<LangToggle />} />}
      footer={
        <Button
          label={t.staffPortal.saveSchedule}
          onPress={async () => {
            try {
              await saveTimetable(table);
            } catch (e) {
              reportError(e);
              return;
            }
            if (notify) {
              toast.show({
                emoji: '🚌',
                title: t.staffPortal.scheduleSavedTitle,
                body: t.staffPortal.scheduleSavedBody,
              });
            }
            router.back();
          }}
        />
      }
      gap={12}
    >
      <View style={[styles.toggle, { backgroundColor: colors.backgroundSurface }]}>
        {(['fromCampus', 'toCampus'] as const).map((d) => {
          const on = direction === d;
          return (
            <Pressable
              key={d}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setDirection(d)}
              style={[styles.tab, on && { backgroundColor: colors.brandPrimary }]}
            >
              <AppText variant="label" tone={on ? 'onBrand' : 'primary'}>
                {d === 'fromCampus' ? t.transport.uniToMetro : t.transport.metroToUni}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.list, { borderColor: colors.borderDefault }]}>
        {times.map((time, idx) => (
          <View
            key={`${time}-${idx}`}
            style={[styles.row, { borderBottomColor: colors.borderDefault }]}
          >
            <AppText tone="secondary">⋮⋮</AppText>
            <View style={styles.flex}>
              <PickerField
                compact
                mode="time"
                value={hhmmToDate(time)}
                display={formatTime(toMinutes(time), language)}
                onChange={(d) => update(times.map((x, k) => (k === idx ? dateToHhmm(d) : x)))}
              />
            </View>
            <Icon name="edit" size={16} color={colors.brandPrimary} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`✕ ${time}`}
              hitSlop={8}
              onPress={() => update(times.filter((_, k) => k !== idx))}
            >
              <AppText variant="bodyStrong" tone="error">
                ✕
              </AppText>
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const last = times[times.length - 1] ?? '07:30';
            const [h, m] = last.split(':').map(Number);
            update([
              ...times,
              `${String(Math.min(h + 1, 22)).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            ]);
          }}
          style={styles.add}
        >
          <AppText variant="label" tone="brand">
            {t.staffPortal.addDeparture}
          </AppText>
        </Pressable>
      </View>

      <View style={[styles.notify, { backgroundColor: colors.backgroundSurface }]}>
        <Icon name="bellPlus" size={16} color={colors.brandPrimary} />
        <AppText variant="caption" weight="semibold" style={styles.flex}>
          {t.staffPortal.notifyRiders}
        </AppText>
        <Switch
          value={notify}
          onValueChange={setNotify}
          trackColor={{ true: colors.brandPrimary, false: colors.borderDefault }}
          thumbColor="#FFFFFF"
          accessibilityLabel={t.staffPortal.notifyRiders}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toggle: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  list: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  add: { paddingHorizontal: 14, paddingVertical: 12 },
  notify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
