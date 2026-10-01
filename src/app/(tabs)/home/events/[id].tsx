import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { AppText, Button, Card, Screen, TopBar } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Tag } from '@/features/events/components';
import { fmt, useI18n } from '@/i18n';
import { formatLongDate, formatTime, toMinutes } from '@/services/clock';
import { eventDate, events, going, toggleGoing } from '@/services/events';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

// Figma 08.1 · Event Details
export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const e = events.use().find((x) => x.id === id);
  const isGoing = going.use().includes(id ?? '');
  if (!e) return null;

  const date = formatLongDate(eventDate(e), language);
  const time = `${formatTime(toMinutes(e.start), language).replace(/^0/, '')} – ${formatTime(toMinutes(e.end), language).replace(/^0/, '')}`;
  const canEdit =
    (e.kind === 'club' && session?.role === 'clubAdmin') ||
    (e.kind === 'university' && session?.role === 'uniAdmin');

  return (
    <Screen header={<TopBar title={t.events.detailsTitle} />} gap={14}>
      <View style={[styles.hero, { backgroundColor: colors.brandPrimary }]}>
        <View style={styles.tags}>
          <Tag
            label={e.kind === 'club' ? t.events.tagClubEvent : t.events.tagUniEvent}
            tone="today"
          />
          <View style={[styles.whiteTag, { backgroundColor: colors.backgroundPrimary }]}>
            <AppText size={10} weight="bold" tone={isGoing ? 'success' : 'brand'}>
              {isGoing
                ? t.events.tagGoing
                : e.dayOffset === 0
                  ? t.events.tagToday
                  : t.events.tagUpcoming}
            </AppText>
          </View>
        </View>
        <AppText size={24} weight="bold" tone="onBrand" style={{ letterSpacing: -0.48 }}>
          {e.title[language]}
        </AppText>
        <View style={styles.host}>
          <View style={[styles.hostIcon, { backgroundColor: colors.backgroundPrimary }]}>
            <AppText variant="label" weight="bold" tone="brand">
              {e.hostInitial}
            </AppText>
          </View>
          <AppText variant="label" weight="medium" tone="onBrand">
            {fmt(t.events.hostedBy, { host: e.host[language] })}
          </AppText>
        </View>
      </View>

      <Card style={styles.info}>
        <InfoRow icon="calendar" label={t.events.date} value={date} />
        <InfoRow icon="clock" label={t.events.time} value={time} />
        <InfoRow icon="pin" label={t.events.venue} value={e.venueDetail[language]} />
        <InfoRow icon="users" label={t.events.audience} value={e.audience[language]} />
      </Card>

      <AppText variant="headingSmall" style={styles.sectionTop}>
        {t.events.about}
      </AppText>
      <AppText variant="label" weight="regular" tone="secondary" style={{ lineHeight: 19 }}>
        {e.about[language]}
      </AppText>

      {e.registrationUrl && (
        <View style={[styles.note, { backgroundColor: 'rgba(246,137,56,0.1)' }]}>
          <Icon name="link" size={18} color={colors.brandPrimary} />
          <AppText variant="captionStrong" style={styles.flex}>
            {t.events.registrationNote}
          </AppText>
        </View>
      )}

      {e.registrationUrl ? (
        <Button
          label={t.events.register}
          onPress={() => {
            Linking.openURL(e.registrationUrl!).catch(() => {});
            if (!isGoing) toggleGoing(e.id);
          }}
        />
      ) : (
        <Button
          label={isGoing ? t.events.cancelRsvp : t.events.rsvp}
          variant={isGoing ? 'secondary' : 'primary'}
          onPress={() => toggleGoing(e.id)}
        />
      )}
      <Button
        label={t.events.addCalendar}
        variant="secondary"
        onPress={() =>
          toast.show({
            emoji: '📅',
            title: t.events.calendarTitle,
            body: fmt(t.events.calendarBody, { title: e.title[language], date }),
          })
        }
      />

      {canEdit && (
        <View style={[styles.admin, { borderColor: colors.textSecondary }]}>
          <Icon name="edit" size={16} color={colors.textSecondary} />
          <AppText variant="captionStrong" tone="secondary" style={styles.flex}>
            {t.events.adminView}
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/staff/event-editor', params: { id: e.id } })}
            style={[styles.edit, { backgroundColor: colors.inkPrimary }]}
          >
            <AppText variant="caption" weight="semibold" style={{ color: '#FFFFFF' }}>
              {t.events.edit}
            </AppText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <View
        style={[
          styles.infoIcon,
          { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
        ]}
      >
        <Icon name={icon} size={18} color={colors.brandPrimary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="tiny" tone="secondary">
          {label}
        </AppText>
        <AppText variant="bodySmall" weight="semibold">
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { borderRadius: 20, padding: 18, gap: 10 },
  tags: { flexDirection: 'row', gap: 6 },
  whiteTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  host: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hostIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { gap: 14, borderRadius: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTop: { marginTop: 4 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  admin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  edit: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
});
