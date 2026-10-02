import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icons';
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
import { useI18n } from '@/i18n';
import { formatDate } from '@/services/clock';
import { reportError } from '@/services/errors';
import {
  deleteEvent,
  eventDate,
  events,
  upsertEvent,
  useClubs,
  type CampusEvent,
  type EventKind,
} from '@/services/events';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

const DAY = 24 * 60 * 60 * 1000;

function daysFromToday(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY);
}

// Figma 13.3 · Club Event Editor and 13.6 · University Event Editor
export default function EventEditor() {
  const params = useLocalSearchParams<{ id?: string; kind?: EventKind }>();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();
  const clubs = useClubs();
  const existing = events.useValue().find((e) => e.id === params.id);
  const kind: EventKind = existing?.kind ?? params.kind ?? 'club';
  const clubId = existing?.clubId ?? session?.clubId ?? 'gdg';
  const myClub = clubs.find((c) => c.id === clubId);
  const [saving, setSaving] = useState(false);
  const organizer =
    kind === 'club'
      ? (myClub?.name[language] ?? '')
      : language === 'ar'
        ? 'جامعة اليمامة · شؤون الطلاب'
        : 'Al Yamamah University · Student Affairs';

  const [title, setTitle] = useState(existing?.title[language] ?? '');
  const [date, setDate] = useState(() =>
    existing ? eventDate(existing) : new Date(Date.now() + 7 * DAY),
  );
  const [dateSet, setDateSet] = useState(existing?.dateSet !== false);
  const [start, setStart] = useState(existing?.start ?? '17:00');
  const [end, setEnd] = useState(existing?.end ?? '19:00');
  const [venue, setVenue] = useState(existing?.venueDetail[language] ?? '');
  const [about, setAbout] = useState(existing?.about[language] ?? '');
  const [needsReg, setNeedsReg] = useState(!!existing?.registrationUrl);
  const [link, setLink] = useState(existing?.registrationUrl ?? '');

  const build = (draft: boolean): CampusEvent => {
    const loc = (v: string, prev?: { en: string; ar: string }) => ({
      en: v,
      ar: v,
      ...prev,
      [language]: v,
    });
    return {
      id: existing?.id ?? `evt-${Date.now()}`,
      kind,
      clubId: kind === 'club' ? clubId : undefined,
      title: loc(title.trim(), existing?.title),
      host:
        existing?.host ??
        (kind === 'club'
          ? (myClub?.name ?? { en: '', ar: '' })
          : { en: 'Student Affairs', ar: 'شؤون الطلاب' }),
      hostInitial:
        existing?.hostInitial ??
        (kind === 'club' ? (myClub?.name.en[0] ?? 'C').toUpperCase() : 'Y'),
      dayOffset: daysFromToday(date),
      dateSet,
      start,
      end,
      venue: loc(venue.split('·')[0].trim(), existing?.venue),
      venueDetail: loc(venue.trim(), existing?.venueDetail),
      audience: existing?.audience ?? { en: 'Open to all students', ar: 'مفتوحة لجميع الطلاب' },
      about: loc(about.trim(), existing?.about),
      registrationUrl: needsReg && link.trim() ? link.trim() : undefined,
      draft,
      goingCount: existing?.goingCount ?? 0,
    };
  };

  const save = async (draft: boolean) => {
    setSaving(true);
    try {
      await upsertEvent(build(draft));
    } catch (e) {
      reportError(e);
      setSaving(false);
      return;
    }
    toast.show(
      draft
        ? { emoji: '📝', title: t.staffPortal.draftTitle, body: t.staffPortal.draftBody }
        : { emoji: '🎉', title: t.staffPortal.publishedTitle, body: t.staffPortal.publishedBody },
    );
    router.back();
  };

  return (
    <Screen
      header={<TopBar title={t.staffPortal.editorTitle} right={<LangToggle />} />}
      footer={
        <View style={styles.footer}>
          <Button
            label={t.staffPortal.publish}
            disabled={!title.trim() || !dateSet || saving}
            onPress={() => save(false)}
          />
          <Button
            label={t.staffPortal.saveDraft}
            variant="secondary"
            disabled={!title.trim() || saving}
            onPress={() => save(true)}
          />
        </View>
      }
      gap={14}
    >
      <View style={styles.group}>
        <AppText variant="captionStrong" tone="secondary">
          {t.staffPortal.organizer}
        </AppText>
        <View
          style={[
            styles.locked,
            { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
          ]}
        >
          <Icon name="lock" size={18} color={colors.textSecondary} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {organizer}
          </AppText>
          <View style={[styles.tag, { backgroundColor: 'rgba(46,125,51,0.14)' }]}>
            <AppText size={10} weight="bold" tone="success">
              {kind === 'club' ? t.events.tagClubEvent : t.events.tagUniEvent}
            </AppText>
          </View>
        </View>
        <AppText variant="tiny" weight="regular" tone="secondary">
          {t.staffPortal.organizerLocked}
        </AppText>
      </View>

      <TextField label={t.staffPortal.eventTitle} value={title} onChangeText={setTitle} />
      <View style={styles.row}>
        <PickerField
          label={t.staffPortal.date}
          mode="date"
          value={date}
          display={dateSet ? formatDate(date, language) : t.staffPortal.dateNotSet}
          onChange={(d) => {
            setDate(d);
            setDateSet(true);
          }}
        />
        <View style={styles.flex}>
          <View style={styles.row}>
            <PickerField
              label={t.staffPortal.time}
              mode="time"
              value={hhmmToDate(start)}
              display={clock(start, language)}
              onChange={(d) => setStart(dateToHhmm(d))}
            />
            <PickerField
              label=" "
              mode="time"
              value={hhmmToDate(end)}
              display={clock(end, language, true)}
              onChange={(d) => setEnd(dateToHhmm(d))}
            />
          </View>
        </View>
      </View>
      <TextField label={t.staffPortal.venue} value={venue} onChangeText={setVenue} />
      <TextField
        label={t.staffPortal.description}
        value={about}
        onChangeText={setAbout}
        multiline
        style={styles.multiline}
        textAlignVertical="top"
      />

      <View style={[styles.reg, { backgroundColor: colors.backgroundSurface }]}>
        <Icon name="link" size={18} color={colors.brandPrimary} />
        <View style={styles.flex}>
          <AppText variant="bodySmall" weight="semibold">
            {t.staffPortal.requiresReg}
          </AppText>
          <AppText variant="tiny" weight="regular" tone="secondary">
            {t.staffPortal.requiresRegSub}
          </AppText>
        </View>
        <Switch
          value={needsReg}
          onValueChange={setNeedsReg}
          trackColor={{ true: colors.brandPrimary, false: colors.borderDefault }}
          thumbColor="#FFFFFF"
          accessibilityLabel={t.staffPortal.requiresReg}
        />
      </View>
      {needsReg && (
        <TextField
          label={t.staffPortal.regLink}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://"
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => Alert.alert(t.staffPortal.uploadCover, t.staffPortal.coverSoon)}
        style={[styles.cover, { borderColor: colors.textSecondary }]}
      >
        <AppText variant="label" tone="secondary">
          {t.staffPortal.uploadCover}
        </AppText>
      </Pressable>
      {existing && (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            try {
              await deleteEvent(existing.id);
            } catch (e) {
              reportError(e);
              return;
            }
            router.back();
          }}
          style={styles.delete}
        >
          <AppText variant="label" tone="error" align="center">
            {t.staffPortal.delete}
          </AppText>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 6 },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  row: { flexDirection: 'row', gap: 10 },
  multiline: { height: 90, paddingTop: 14 },
  reg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cover: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  delete: { paddingVertical: 8 },
  footer: { gap: 10 },
});
