import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, LangToggle, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/services/errors';
import { useSession } from '@/services/session';
import { typography, useTheme } from '@/theme';

type Mode = 'phone' | 'email';

// Figma 01.1 · Guest Registration
export default function GuestRegistration() {
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { signInGuest } = useSession();
  const [mode, setMode] = useState<Mode>('phone');
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<'contact' | 'name' | null>('contact');

  const valid = name.trim().length > 1 && contact.trim().length > 3;
  const field = (key: 'contact' | 'name') => [
    styles.field,
    {
      backgroundColor: colors.backgroundSurface,
      borderColor: focused === key ? colors.brandPrimary : colors.borderDefault,
    },
  ];
  const inputStyle = [
    typography.body,
    styles.input,
    { color: colors.textPrimary, textAlign: isRTL ? ('right' as const) : ('left' as const) },
  ];

  return (
    <Screen
      gap={12}
      header={
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            onPress={() => router.back()}
            style={[styles.back, { backgroundColor: colors.backgroundSurface }]}
          >
            <Icon name="chevronLeft" flipRTL />
          </Pressable>
          <AppText variant="title" size={18} style={styles.flex}>
            {t.guestReg.title}
          </AppText>
          <LangToggle />
        </View>
      }
      footer={
        <View style={styles.footer}>
          <View style={[styles.note, { backgroundColor: colors.backgroundSurface }]}>
            <AppText variant="bodySmall">🔒</AppText>
            <AppText variant="caption" tone="secondary" style={styles.flex}>
              {t.guestReg.privacy}
            </AppText>
          </View>
          <Button
            label={t.guestReg.continue}
            disabled={!valid || busy}
            onPress={async () => {
              setBusy(true);
              try {
                await signInGuest(
                  name.trim(),
                  mode === 'phone' ? `+966${contact.trim()}` : contact.trim(),
                );
                router.replace('/'); // the entry screen sends guests to their home
              } catch (e) {
                Alert.alert(t.guestReg.title, errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      }
    >
      <View style={[styles.badge, { backgroundColor: colors.brandPrimarySoft }]}>
        <View style={[styles.badgeIcon, { backgroundColor: colors.brandPrimary }]} />
        <View>
          <AppText variant="bodySmall" weight="semibold">
            {t.guestReg.badgeTitle}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t.guestReg.badgeSubtitle}
          </AppText>
        </View>
      </View>
      <View style={[styles.rule, { backgroundColor: colors.borderDefault }]} />

      <AppText variant="bodySmall" weight="semibold" style={styles.sectionTop}>
        {t.guestReg.contactTitle}
      </AppText>
      <AppText variant="label" weight="regular" tone="secondary">
        {t.guestReg.contactHint}
      </AppText>
      <View style={[styles.segment, { backgroundColor: colors.backgroundSurface }]}>
        {(['phone', 'email'] as const).map((m) => {
          const on = mode === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setMode(m);
                setContact('');
              }}
              style={[styles.segmentTab, on && { backgroundColor: colors.brandPrimary }]}
            >
              <AppText
                variant="label"
                weight={on ? 'semibold' : 'regular'}
                tone={on ? 'onBrand' : 'secondary'}
              >
                {m === 'phone' ? t.guestReg.phoneTab : t.guestReg.emailTab}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={field('contact')}>
        {mode === 'phone' && (
          <>
            <AppText>🇸🇦 +966</AppText>
            <View style={[styles.sep, { backgroundColor: colors.borderDefault }]} />
          </>
        )}
        <TextInput
          value={contact}
          onChangeText={setContact}
          onFocus={() => setFocused('contact')}
          placeholder={mode === 'phone' ? t.guestReg.phonePlaceholder : t.guestReg.emailPlaceholder}
          placeholderTextColor={colors.inkOnInkMuted}
          keyboardType={mode === 'phone' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          style={inputStyle}
        />
      </View>

      <AppText variant="bodySmall" weight="semibold" style={styles.sectionTop}>
        {t.guestReg.nameTitle}
      </AppText>
      <AppText variant="label" weight="regular" tone="secondary">
        {t.guestReg.nameHint}
      </AppText>
      <View style={field('name')}>
        <TextInput
          value={name}
          onChangeText={setName}
          onFocus={() => setFocused('name')}
          placeholder={t.guestReg.namePlaceholder}
          placeholderTextColor={colors.inkOnInkMuted}
          autoCapitalize="words"
          style={inputStyle}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  back: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { height: 1, marginVertical: 8 },
  sectionTop: { marginTop: 8 },
  segment: { flexDirection: 'row', height: 44, padding: 4, gap: 4, borderRadius: 12 },
  segmentTab: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  field: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sep: { width: 1, height: 20 },
  input: { flex: 1, height: '100%', padding: 0 },
  footer: { gap: 24 },
  note: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
