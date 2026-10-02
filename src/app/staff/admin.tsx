import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { EventAdminRow } from '@/features/staff/EventAdminRow';
import { StaffHeader, StaffRootBar } from '@/features/staff/components';
import { fmt, useI18n } from '@/i18n';
import { events } from '@/services/events';
import { shuttleTimetable } from '@/services/transport';
import { useTheme } from '@/theme';

// Figma 13.4 · University Admin
export default function UniversityAdmin() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const uni = events
    .useValue()
    .filter((e) => e.kind === 'university')
    .sort((a, b) => a.dayOffset - b.dayOffset);
  const trips = shuttleTimetable.useValue().fromCampus.length;

  return (
    <Screen header={<StaffRootBar title={t.staffPortal.uniTitle} />} gap={12}>
      <StaffHeader initials="YU" name={t.staffPortal.uniName} role={t.staffPortal.uniRole} />
      <Button
        label={t.staffPortal.addUniEvent}
        onPress={() =>
          router.push({ pathname: '/staff/event-editor', params: { kind: 'university' } })
        }
      />
      <AppText variant="bodyStrong" style={styles.sectionTop}>
        {t.staffPortal.uniEvents}
      </AppText>
      {uni.map((e) => (
        <EventAdminRow key={e.id} event={e} />
      ))}
      <AppText variant="bodyStrong" style={styles.sectionTop}>
        {t.staffPortal.campusTransport}
      </AppText>
      <Card style={styles.shuttle}>
        <View style={[styles.busIcon, { backgroundColor: colors.brandPrimary }]}>
          <Icon name="bus" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodySmall" weight="semibold">
            {t.staffPortal.shuttleSchedule}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {fmt(t.staffPortal.shuttleSummary, { n: trips })}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/staff/shuttle-editor')}
          style={[styles.edit, { backgroundColor: colors.brandPrimary }]}
        >
          <Icon name="edit" size={13} color="#FFFFFF" />
          <AppText variant="caption" weight="semibold" tone="onBrand">
            {t.staffPortal.edit}
          </AppText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionTop: { marginTop: 6 },
  shuttle: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16 },
  busIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
});
