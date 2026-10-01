import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { EventAdminRow } from '@/features/staff/EventAdminRow';
import { StaffHeader, StaffRootBar } from '@/features/staff/components';
import { useI18n } from '@/i18n';
import { clubs, events } from '@/services/events';
import { useTheme } from '@/theme';

const CLUB_ID = 'gdg';
const FOLLOWERS = 412;

// Figma 13.2 · Club Admin
export default function ClubAdmin() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const mine = events.use().filter((e) => e.clubId === CLUB_ID);
  const active = mine.filter((e) => !e.draft);
  const rsvps = active.reduce((n, e) => n + e.goingCount, 0);
  const club = clubs.find((c) => c.id === CLUB_ID)!;

  return (
    <Screen header={<StaffRootBar title={t.staffPortal.clubTitle} />} gap={12}>
      <StaffHeader initials="G" name={club.name[language]} role={t.staffPortal.clubRole} />
      <View style={styles.stats}>
        {(
          [
            [active.length, t.staffPortal.activeEvents],
            [rsvps, t.staffPortal.totalRsvps],
            [FOLLOWERS, t.staffPortal.followersLabel],
          ] as const
        ).map(([value, label]) => (
          <View key={label} style={[styles.stat, { backgroundColor: colors.backgroundSurface }]}>
            <AppText variant="title" weight="bold" size={20}>
              {value}
            </AppText>
            <AppText variant="tiny" tone="secondary">
              {label}
            </AppText>
          </View>
        ))}
      </View>
      <Button
        label={t.staffPortal.addEvent}
        onPress={() => router.push({ pathname: '/staff/event-editor', params: { kind: 'club' } })}
      />
      <AppText variant="bodyStrong" style={styles.sectionTop}>
        {t.staffPortal.yourEvents}
      </AppText>
      {mine.map((e) => (
        <EventAdminRow key={e.id} event={e} showStatus />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: 14 },
  sectionTop: { marginTop: 6 },
});
