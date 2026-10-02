import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, Screen, TopBar } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { book, estimate, laterSlots, ticket, useAffairsServices } from '@/services/affairs';
import { reportError } from '@/services/errors';
import { formatTime } from '@/services/clock';
import { useTheme } from '@/theme';

// Figma 10 · Student Affairs
export default function StudentAffairs() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const current = ticket.useValue();
  const affairsServices = useAffairsServices();
  const [serviceId, setServiceId] = useState('scholarships');
  const [slot, setSlot] = useState<number | 'next'>('next');
  const service = affairsServices.find((s) => s.id === serviceId) ?? affairsServices[0];
  if (!service) return null;
  const e = estimate(service, slot);

  return (
    <Screen
      header={<TopBar title={t.affairs.title} />}
      footer={
        current ? (
          <Button
            label={fmt(t.affairs.viewTicket, { number: current.number })}
            onPress={() => router.push('/home/affairs/ticket')}
          />
        ) : (
          <Button
            label={t.affairs.book}
            onPress={async () => {
              try {
                await book(service, slot);
              } catch (err) {
                reportError(err);
                return;
              }
              router.push('/home/affairs/ticket');
            }}
          />
        )
      }
      gap={12}
    >
      <AppText variant="bodyStrong">{t.affairs.service}</AppText>
      <View style={styles.services}>
        {affairsServices.map((s) => {
          const on = s.id === serviceId;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setServiceId(s.id)}
              style={[
                styles.service,
                on
                  ? {
                      backgroundColor: colors.backgroundPrimary,
                      borderColor: colors.brandPrimary,
                      borderWidth: 2,
                    }
                  : {
                      backgroundColor: colors.backgroundSurface,
                      borderColor: 'transparent',
                      borderWidth: 2,
                    },
              ]}
            >
              <View style={styles.flex}>
                <AppText variant="bodySmall" weight="semibold">
                  {s.name[language]}
                </AppText>
                <View style={styles.meta}>
                  <Icon name="users" size={13} color={colors.textSecondary} />
                  <AppText variant="caption" tone="secondary">
                    {fmt(t.affairs.waiting, { n: s.waiting })}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    ·
                  </AppText>
                  <Icon name="clock" size={13} color={colors.textSecondary} />
                  <AppText variant="caption" tone="secondary">
                    {fmt(t.affairs.wait, { n: s.waitMin })}
                  </AppText>
                </View>
              </View>
              <View
                style={[
                  styles.radio,
                  on
                    ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                    : {
                        borderColor: colors.borderDefault,
                        backgroundColor: colors.backgroundPrimary,
                      },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <AppText variant="bodyStrong" style={styles.sectionTop}>
        {t.affairs.when}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slots}
      >
        {(['next', ...laterSlots] as const).map((s) => {
          const on = s === slot;
          return (
            <Pressable
              key={String(s)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSlot(s)}
              style={[
                styles.slot,
                on
                  ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                  : {
                      backgroundColor: colors.backgroundSurface,
                      borderColor: colors.borderDefault,
                    },
              ]}
            >
              <AppText
                variant="label"
                weight={on ? 'semibold' : 'medium'}
                tone={on ? 'onBrand' : 'primary'}
              >
                {s === 'next' ? t.affairs.nextAvailable : formatTime(s, language).replace(/^0/, '')}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.estimate, { backgroundColor: colors.inkPrimary }]}>
        <AppText variant="label" weight="medium" style={{ color: colors.inkOnInkMuted }}>
          {t.affairs.ifBookNow}
        </AppText>
        <View style={styles.stats}>
          <Stat value={e.number} label={t.affairs.yourNumber} />
          <Stat value={String(e.ahead)} label={t.affairs.ahead} />
          <Stat value={fmt(t.affairs.minutes, { n: e.waitMin })} label={t.affairs.estWait} />
        </View>
        <View style={styles.meta}>
          <Icon name="clock" size={14} color={colors.brandPrimary} />
          <AppText variant="label" style={{ color: '#FFFFFF' }}>
            {fmt(t.affairs.estAppointment, { time: formatTime(e.at, language).replace(/^0/, '') })}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" tone="secondary" align="center">
        {t.affairs.bookHint}
      </AppText>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
      <AppText variant="title" weight="bold" size={18} style={{ color: '#FFFFFF' }}>
        {value}
      </AppText>
      <AppText variant="tiny" style={{ color: colors.inkOnInkMuted }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  services: { gap: 8 },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  sectionTop: { marginTop: 16 },
  slots: { gap: 8 },
  slot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  estimate: { borderRadius: 18, padding: 16, gap: 12, marginTop: 8 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12 },
});
