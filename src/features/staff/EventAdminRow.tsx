import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Card } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { formatDate, formatTime, toMinutes } from '@/services/clock';
import { eventDate, type CampusEvent } from '@/services/events';
import { useTheme } from '@/theme';

/** Row used by 13.2 · Club Admin and 13.4 · University Admin: title, status, when/where, RSVPs, Edit. */
export function EventAdminRow({ event, showStatus }: { event: CampusEvent; showStatus?: boolean }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const time = formatTime(toMinutes(event.start), language).replace(/^0/, '');
  const when =
    event.dateSet === false
      ? t.staffPortal.dateNotSet
      : `${event.dayOffset === 0 ? t.events.today : formatDate(eventDate(event), language)} · ${time} · ${event.venue[language]}`;

  return (
    <Card style={styles.card}>
      <View style={styles.between}>
        <AppText variant="bodySmall" weight="semibold" style={styles.flex} numberOfLines={1}>
          {event.title[language]}
        </AppText>
        {showStatus && (
          <View
            style={[
              styles.status,
              { backgroundColor: event.draft ? colors.backgroundSurface : 'rgba(46,125,51,0.14)' },
            ]}
          >
            <AppText
              size={10}
              weight="bold"
              style={{ color: event.draft ? colors.textSecondary : colors.statusSuccess }}
            >
              {event.draft ? t.staffPortal.draft : t.staffPortal.published}
            </AppText>
          </View>
        )}
      </View>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {when}
      </AppText>
      <View style={styles.between}>
        <AppText variant="caption" weight="semibold">
          {event.draft ? '—' : fmt(t.staffPortal.goingCount, { n: event.goingCount })}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.staffPortal.edit} ${event.title[language]}`}
          onPress={() => router.push({ pathname: '/staff/event-editor', params: { id: event.id } })}
          style={[styles.edit, { backgroundColor: colors.inkPrimary }]}
        >
          <Icon name="edit" size={13} color="#FFFFFF" />
          <AppText variant="caption" weight="semibold" style={{ color: '#FFFFFF' }}>
            {t.staffPortal.edit}
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 6, borderRadius: 16, paddingVertical: 14 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  status: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
});
