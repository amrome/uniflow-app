import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Card } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { formatTime, monthShort, toMinutes } from '@/services/clock';
import { eventDate, sortClubs, useClubs, type CampusEvent } from '@/services/events';
import { useTheme } from '@/theme';

type TagTone = 'going' | 'today' | 'upcoming' | 'outline';

export function Tag({ label, tone }: { label: string; tone: TagTone }) {
  const { colors } = useTheme();
  const look = {
    going: { bg: 'rgba(46,125,51,0.14)', fg: colors.statusSuccess, border: 'transparent' },
    today: { bg: colors.inkPrimary, fg: '#FFFFFF', border: 'transparent' },
    upcoming: { bg: 'rgba(246,137,56,0.14)', fg: colors.brandPrimary, border: 'transparent' },
    outline: {
      bg: colors.backgroundPrimary,
      fg: colors.textSecondary,
      border: colors.borderDefault,
    },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: look.bg, borderColor: look.border }]}>
      <AppText
        size={10}
        weight={tone === 'outline' ? 'semibold' : 'bold'}
        style={{ color: look.fg }}
      >
        {label}
      </AppText>
    </View>
  );
}

/** Figma Event/* row: date block, status + kind tags, title, host, time · venue. */
export function EventRow({
  event,
  going,
  onPress,
}: {
  event: CampusEvent;
  going: boolean;
  onPress: () => void;
}) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const date = eventDate(event);
  const today = event.dayOffset === 0;
  const status = going ? (
    <Tag label={t.events.tagGoing} tone="going" />
  ) : today ? (
    <Tag label={t.events.tagToday} tone="today" />
  ) : (
    <Tag label={t.events.tagUpcoming} tone="upcoming" />
  );
  const kind = event.kind === 'club' ? t.events.club : t.events.university;

  return (
    <Card
      onPress={onPress}
      flat={going}
      accessibilityLabel={event.title[language]}
      style={[
        styles.row,
        going && { borderColor: colors.statusSuccess, borderWidth: 1.5, borderRadius: 16 },
      ]}
    >
      <View
        style={[
          styles.dateBlock,
          today && !going
            ? { backgroundColor: colors.brandPrimary }
            : {
                backgroundColor: colors.backgroundSurface,
                borderColor: colors.borderDefault,
                borderWidth: going ? 0 : 1,
              },
        ]}
      >
        <AppText size={18} weight="bold" tone={today && !going ? 'onBrand' : 'primary'}>
          {String(date.getDate()).padStart(2, '0')}
        </AppText>
        <AppText size={10} weight="bold" tone={today && !going ? 'onBrand' : 'brand'}>
          {monthShort(date, language)}
        </AppText>
      </View>
      <View style={styles.body}>
        <View style={styles.tags}>
          {status}
          <Tag label={event.kind === 'club' ? t.events.tagClub : t.events.tagUni} tone="outline" />
          {going && event.registrationUrl && (
            <Tag label={t.events.tagRegistration} tone="outline" />
          )}
        </View>
        <AppText variant="bodySmall" weight="semibold" numberOfLines={1}>
          {event.title[language]}
        </AppText>
        <AppText variant="tiny" tone="secondary" numberOfLines={1}>
          {fmt(t.events.meta, { kind, host: event.host[language] })}
        </AppText>
        <AppText variant="tiny" weight="regular" tone="secondary" numberOfLines={1}>
          {fmt(t.events.when, {
            time: formatTime(toMinutes(event.start), language).replace(/^0/, ''),
            venue: event.venue[language],
          })}
        </AppText>
      </View>
    </Card>
  );
}

/** Figma Popup/AllClubs: bottom sheet with a two-column grid of club initials + names. */
export function AllClubsSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (clubId: string) => void;
}) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const clubs = useClubs();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.events.close} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.backgroundPrimary, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.sheetHead}>
          <AppText variant="headingLarge">{t.events.allClubsTitle}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.events.close}
            hitSlop={10}
            onPress={onClose}
          >
            <AppText variant="body" tone="secondary">
              ✕
            </AppText>
          </Pressable>
        </View>
        <AppText variant="caption" tone="secondary">
          {fmt(t.events.allClubsSub, { n: clubs.length })}
        </AppText>
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {sortClubs(clubs, language).map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() => onPick(c.id)}
              style={styles.club}
            >
              <View style={[styles.initial, { backgroundColor: colors.brandPrimarySoft }]}>
                <AppText variant="label" weight="bold" tone="brand">
                  {c.name[language].replace(/^(نادي|جمعية)\s+/, '').charAt(0)}
                </AppText>
              </View>
              <AppText variant="label" weight="medium" numberOfLines={2} style={styles.flex}>
                {c.name[language]}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingStart: 12,
    paddingEnd: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  dateBlock: {
    width: 52,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 6,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, paddingTop: 16, paddingBottom: 8 },
  club: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingEnd: 8 },
  initial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
