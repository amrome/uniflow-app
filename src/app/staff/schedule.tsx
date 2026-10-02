import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  LangToggle,
  PickerField,
  Screen,
  TextField,
  TopBar,
  dateToHhmm,
  hhmmToDate,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { clock } from '@/features/schedules/components';
import { DayTabs, SlotRow } from '@/features/schedules/Timetable';
import { useI18n } from '@/i18n';
import { reportError } from '@/services/errors';
import {
  TODAY,
  saveWeek,
  timetables,
  type Slot,
  type SlotType,
  type WeekDay,
} from '@/services/schedules';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

const types: SlotType[] = ['CLS', 'CP', 'OH', 'DD', 'PM', 'RS'];

// Figma 03.1a · Edit Schedule
export default function EditSchedule() {
  const { session } = useSession();
  const instructorId = session?.instructorId ?? 'sarah';
  const saved = timetables.useValue()[instructorId];
  if (!saved) return null;
  return <ScheduleForm instructorId={instructorId} initial={saved} />;
}

function ScheduleForm({
  instructorId,
  initial,
}: {
  instructorId: string;
  initial: Record<WeekDay, Slot[]>;
}) {
  const { t, language } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [week, setWeek] = useState(initial);
  const [day, setDay] = useState<WeekDay>(TODAY);
  const [editing, setEditing] = useState<number | null>(null);

  const slots = week[day];
  const setSlots = (next: Slot[]) =>
    setWeek((w) => ({ ...w, [day]: [...next].sort((a, b) => a.start.localeCompare(b.start)) }));

  return (
    <Screen
      header={<TopBar title={t.schedules.editTitle} boxedBack right={<LangToggle />} />}
      footer={
        <Button
          label={t.schedules.saveSchedule}
          onPress={async () => {
            try {
              await saveWeek(instructorId, week);
            } catch (e) {
              reportError(e);
              return;
            }
            toast.show({ emoji: '📅', title: t.schedules.saved, body: t.schedules.savedBody });
            router.back();
          }}
        />
      }
      gap={12}
    >
      <View>
        <AppText variant="headingLarge">{t.schedules.daysLong[day]}</AppText>
        <AppText variant="caption" tone="secondary">
          {t.schedules.editHint}
        </AppText>
      </View>
      <DayTabs value={day} onChange={setDay} />
      <View style={styles.slots}>
        {slots.map((s, idx) => (
          <SlotRow key={`${s.start}-${idx}`} slot={s} editable onPress={() => setEditing(idx)} />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          const last = slots[slots.length - 1];
          const start = last?.end ?? '08:30';
          const [h, m] = start.split(':').map(Number);
          const end = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          setSlots([
            ...slots,
            {
              start,
              end,
              type: 'CLS',
              title: { en: t.schedules.newSlot, ar: t.schedules.newSlot },
              room: { en: '', ar: '' },
            },
          ]);
          setEditing(slots.length);
        }}
      >
        <AppText variant="bodySmall" weight="semibold" tone="brand">
          {t.schedules.addSlot}
        </AppText>
      </Pressable>

      {editing !== null && slots[editing] && (
        <SlotEditor
          slot={slots[editing]}
          language={language}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            setSlots(slots.map((x, k) => (k === editing ? s : x)));
            setEditing(null);
          }}
          onRemove={() => {
            setSlots(slots.filter((_, k) => k !== editing));
            setEditing(null);
          }}
        />
      )}
    </Screen>
  );
}

function SlotEditor(props: {
  slot: Slot;
  language: 'en' | 'ar';
  onClose: () => void;
  onSave: (s: Slot) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { language } = props;
  const [s, setS] = useState(props.slot);
  const setText = (key: 'title' | 'room', v: string) =>
    setS({ ...s, [key]: { ...s[key], [language]: v } });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} />
      <ScrollView
        style={[styles.sheet, { backgroundColor: colors.backgroundPrimary }]}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label={t.schedules.slotTitle}
          value={s.title[language]}
          onChangeText={(v) => setText('title', v)}
        />
        <TextField
          label={t.schedules.slotRoom}
          value={s.room[language]}
          onChangeText={(v) => setText('room', v)}
        />
        <AppText variant="captionStrong" tone="secondary">
          {t.schedules.slotType}
        </AppText>
        <View style={styles.types}>
          {types.map((ty) => {
            const on = s.type === ty;
            return (
              <Pressable
                key={ty}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setS({ ...s, type: ty })}
                style={[
                  styles.type,
                  on
                    ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                    : {
                        backgroundColor: colors.backgroundSurface,
                        borderColor: colors.borderDefault,
                      },
                ]}
              >
                <AppText variant="caption" weight="semibold" tone={on ? 'onBrand' : 'primary'}>
                  {t.schedules.types[ty]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.times}>
          <PickerField
            label={t.schedules.slotStart}
            mode="time"
            value={hhmmToDate(s.start)}
            display={clock(s.start, language, true)}
            onChange={(d) => setS({ ...s, start: dateToHhmm(d) })}
          />
          <PickerField
            label={t.schedules.slotEnd}
            mode="time"
            value={hhmmToDate(s.end)}
            display={clock(s.end, language, true)}
            onChange={(d) => setS({ ...s, end: dateToHhmm(d) })}
          />
        </View>
        <Button label={t.common.save} onPress={() => props.onSave(s)} />
        <Button label={t.schedules.deleteSlot} variant="danger" onPress={props.onRemove} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slots: { gap: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { flexGrow: 0, maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { padding: 20, paddingBottom: 40, gap: 12 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  type: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  times: { flexDirection: 'row', gap: 10 },
});
