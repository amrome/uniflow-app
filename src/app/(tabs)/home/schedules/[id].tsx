import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Card, Chip, Screen, TopBar } from '@/components/ui';
import { Avatar, NotifyButton, clock } from '@/features/schedules/components';
import { DayTabs, SlotRow } from '@/features/schedules/Timetable';
import { fmt, useI18n } from '@/i18n';
import {
  TODAY,
  getInstructor,
  majors,
  nextHours,
  portal,
  portalFor,
  timetables,
  todayHours,
  type WeekDay,
} from '@/services/schedules';
import { useTheme } from '@/theme';

// Figma 03.1 · Instructor Profile (+ Mon/Tue/Wed/Thu day-tab variants)
export default function InstructorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const tables = timetables.useValue();
  const portals = portal.useValue();
  const [day, setDay] = useState<WeekDay>(TODAY);
  const i = getInstructor(id);
  if (!i) return null;
  const today = todayHours(i, portals);
  const next = nextHours(i, portals);
  const { note, status } = portalFor(i, portals);

  return (
    <Screen header={<TopBar title={t.schedules.profileTitle} />} gap={16}>
      <Card style={styles.hero}>
        <Avatar name={i.name[language]} size={76} />
        <AppText variant="headingLarge" align="center">
          {i.name[language]}
        </AppText>
        <AppText variant="label" weight="regular" tone="secondary" align="center">
          {i.title[language]} · {majors[i.major][language]}
        </AppText>
        <View style={styles.row}>
          {today ? (
            <>
              <Chip
                label={status === 'away' ? t.staffPortal.away : t.schedules.availableNow}
                tone={status === 'away' ? 'brandSoft' : 'successSoft'}
                dot
              />
              <AppText variant="captionStrong" tone="secondary">
                {fmt(t.schedules.until, { time: clock(today.end, language, true) })}
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="captionStrong" tone="secondary">
                {fmt(t.schedules.nextOh, {
                  day: t.schedules.daysLong[next.day],
                  time: clock(next.start, language, true),
                })}
              </AppText>
              <NotifyButton instructorId={i.id} />
            </>
          )}
        </View>
        {!!note && (
          <AppText variant="caption" tone="brand" align="center">
            📌 {note}
          </AppText>
        )}
      </Card>

      <View style={[styles.contact, { borderColor: colors.borderDefault }]}>
        <ContactRow icon="pin" label={t.schedules.office} value={i.office[language]} />
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(`mailto:${i.email}`).catch(() => {})}
        >
          <ContactRow icon="mail" label={t.common.email} value={i.email} />
        </Pressable>
      </View>

      <AppText variant="headingSmall" style={styles.sectionTop}>
        {t.schedules.weekly}
      </AppText>
      <DayTabs value={day} onChange={setDay} />
      <View style={styles.slots}>
        {tables[i.id][day].map((s) => (
          <SlotRow key={`${s.start}-${s.type}`} slot={s} />
        ))}
      </View>
    </Screen>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: 'pin' | 'mail';
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.contactRow}>
      <Icon name={icon} size={20} color={colors.brandPrimary} />
      <View>
        <AppText variant="tiny" tone="secondary">
          {label}
        </AppText>
        <AppText variant="bodySmall" weight="medium">
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  contact: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTop: { marginTop: 8 },
  slots: { gap: 6, marginTop: -4 },
});
