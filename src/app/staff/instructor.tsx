import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import {
  AppText,
  Button,
  PickerField,
  Screen,
  TextField,
  dateToHhmm,
  hhmmToDate,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { clock } from '@/features/schedules/components';
import { StaffHeader, StaffRootBar } from '@/features/staff/components';
import { fmt, useI18n } from '@/i18n';
import { reportError } from '@/services/errors';
import {
  instructorFollowerCount,
  majors,
  portal,
  portalFor,
  savePortal,
  useInstructor,
  weekDays,
  type Instructor,
  type OfficeHour,
  type PortalStatus,
  type WeekDay,
} from '@/services/schedules';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';
import { initials } from '@/utils/format';

// Figma 13.1 · Instructor Portal
export default function InstructorPortal() {
  const { session } = useSession();
  const instructor = useInstructor(session?.instructorId ?? 'sarah');
  if (!instructor) return null;
  return <PortalForm i={instructor} />;
}

function PortalForm({ i }: { i: Instructor }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [followers, setFollowers] = useState(0);
  useEffect(() => {
    instructorFollowerCount(i.dbId).then(setFollowers, () => {});
  }, [i.dbId]);
  const saved = portalFor(i, portal.useValue());
  const [status, setStatus] = useState<PortalStatus>(saved.status);
  const [note, setNote] = useState(saved.note);
  const [hours, setHours] = useState<OfficeHour[]>(saved.hours);
  const [editing, setEditing] = useState<number | null>(null);

  const statuses: [PortalStatus, string, string][] = [
    ['available', t.staffPortal.available, colors.statusSuccess],
    ['away', t.staffPortal.away, colors.brandPrimary],
    ['notAvailable', t.staffPortal.notAvailable, colors.statusError],
  ];

  const save = async () => {
    try {
      await savePortal(i.id, { status, note: note.trim(), hours });
    } catch (e) {
      reportError(e);
      return;
    }
    toast.show({
      emoji: '🔔',
      title: t.staffPortal.savedTitle,
      body: fmt(t.staffPortal.savedBody, { n: followers }),
    });
  };

  return (
    <Screen
      header={<StaffRootBar title={t.staffPortal.instructorTitle} />}
      footer={<Button label={t.staffPortal.saveNotify} onPress={save} />}
      gap={12}
    >
      <StaffHeader
        initials={initials(i.name.en.replace(/^Dr\.?\s*/, ''))}
        name={i.name[language]}
        role={`${majors[i.major][language]} · ${i.office[language]}`}
      />

      <AppText variant="bodyStrong" style={styles.sectionTop}>
        {t.staffPortal.statusNow}
      </AppText>
      <View style={[styles.segment, { backgroundColor: colors.backgroundSurface }]}>
        {statuses.map(([s, label, dot]) => {
          const on = status === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setStatus(s)}
              style={[styles.seg, on && { backgroundColor: dot }]}
            >
              <View style={[styles.dot, { backgroundColor: on ? '#FFFFFF' : dot }]} />
              <AppText variant="label" tone={on ? 'onBrand' : 'primary'} numberOfLines={1}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label={t.staffPortal.note}
        value={note}
        onChangeText={setNote}
        placeholder={t.staffPortal.notePlaceholder}
      />

      <AppText variant="bodyStrong" style={styles.sectionTop}>
        {t.staffPortal.weeklyHours}
      </AppText>
      <View style={[styles.group, { borderColor: colors.borderDefault }]}>
        {hours.map((h, idx) => (
          <Pressable
            key={`${h.day}-${h.start}-${idx}`}
            accessibilityRole="button"
            onPress={() => setEditing(idx)}
            style={[styles.hourRow, { borderBottomColor: colors.borderDefault }]}
          >
            <AppText variant="bodySmall" weight="semibold" style={styles.flex}>
              {t.schedules.daysLong[h.day]}
            </AppText>
            <AppText variant="label" weight="medium">
              {clock(h.start, language, true)} – {clock(h.end, language, true)}
            </AppText>
            <Icon name="edit" size={16} color={colors.brandPrimary} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setHours((p) => [...p, { day: 1, start: '10:00', end: '11:00' }]);
            setEditing(hours.length);
          }}
          style={styles.addRow}
        >
          <AppText variant="bodySmall" weight="semibold" tone="brand">
            {t.staffPortal.addSlot}
          </AppText>
        </Pressable>
      </View>

      <View style={[styles.note, { backgroundColor: 'rgba(246,137,56,0.1)' }]}>
        <Icon name="bellPlus" size={16} color={colors.brandPrimary} />
        <AppText variant="captionStrong" style={styles.flex}>
          {fmt(t.staffPortal.followers, { n: followers })}
        </AppText>
      </View>

      <Button
        label={t.staffPortal.editTimetable}
        variant="secondary"
        icon="calendar"
        onPress={() => router.push('/staff/schedule')}
      />

      <HourEditor
        hour={editing === null ? null : hours[editing]}
        onClose={() => setEditing(null)}
        onSave={(h) => {
          setHours((p) => p.map((x, k) => (k === editing ? h : x)));
          setEditing(null);
        }}
        onRemove={() => {
          setHours((p) => p.filter((_, k) => k !== editing));
          setEditing(null);
        }}
      />
    </Screen>
  );
}

function HourEditor(props: {
  hour: OfficeHour | null;
  onClose: () => void;
  onSave: (h: OfficeHour) => void;
  onRemove: () => void;
}) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<OfficeHour | null>(props.hour);
  const [shownFor, setShownFor] = useState(props.hour);
  if (props.hour !== shownFor) {
    setShownFor(props.hour);
    setDraft(props.hour);
  }
  if (!draft) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.backgroundPrimary }]}>
        <AppText variant="headingLarge">{t.staffPortal.editHoursTitle}</AppText>
        <AppText variant="captionStrong" tone="secondary">
          {t.staffPortal.day}
        </AppText>
        <View style={styles.days}>
          {weekDays.map((d: WeekDay) => {
            const on = draft.day === d;
            return (
              <Pressable
                key={d}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setDraft({ ...draft, day: d })}
                style={[
                  styles.day,
                  on
                    ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                    : {
                        backgroundColor: colors.backgroundSurface,
                        borderColor: colors.borderDefault,
                      },
                ]}
              >
                <AppText variant="label" tone={on ? 'onBrand' : 'secondary'}>
                  {t.schedules.days[d]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.times}>
          <PickerField
            label={t.staffPortal.from}
            mode="time"
            value={hhmmToDate(draft.start)}
            display={clock(draft.start, language, true)}
            onChange={(d) => setDraft({ ...draft, start: dateToHhmm(d) })}
          />
          <PickerField
            label={t.staffPortal.to}
            mode="time"
            value={hhmmToDate(draft.end)}
            display={clock(draft.end, language, true)}
            onChange={(d) => setDraft({ ...draft, end: dateToHhmm(d) })}
          />
        </View>
        <Button label={t.common.save} onPress={() => props.onSave(draft)} />
        <Button label={t.staffPortal.remove} variant="danger" onPress={props.onRemove} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionTop: { marginTop: 8 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12 },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  group: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  addRow: { paddingHorizontal: 14, paddingVertical: 11 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  times: { flexDirection: 'row', gap: 10 },
});
