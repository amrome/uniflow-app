import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon, Logo } from '@/components/icons';
import { AppText, Button, LangToggle, Screen, TextField, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { live } from '@/services/backend';
import { errorMessage } from '@/services/errors';
import { staffDemoEmails, useSession, type StaffRole } from '@/services/session';
import { useTheme } from '@/theme';

// Figma 13 · Staff Login
export default function StaffLogin() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { signInStaff } = useSession();
  const [email, setEmail] = useState<string>(live ? '' : staffDemoEmails.clubAdmin);
  const [password, setPassword] = useState(live ? '' : 'password');
  const [busy, setBusy] = useState(false);

  const logIn = async (role?: StaffRole) => {
    setBusy(true);
    try {
      // With a backend the chips choose which portal to open with the account typed above (one
      // account can hold several staff roles); without one they sign in the matching demo user.
      await signInStaff(role && !live ? staffDemoEmails[role] : email.trim(), password, role);
      router.replace('/'); // the entry screen sends each staff role to its own portal
    } catch (e) {
      Alert.alert(t.staff.loginTitle, errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const demos: [StaffRole, string][] = [
    ['instructor', t.staff.demoInstructor],
    ['clubAdmin', t.staff.demoClub],
    ['uniAdmin', t.staff.demoUni],
    ['restaurant', t.staff.demoRestaurant],
  ];

  return (
    <Screen
      header={<TopBar title={t.staff.loginTitle} right={<LangToggle />} />}
      footer={
        <View style={styles.demo}>
          <AppText variant="tiny" tone="secondary">
            {live ? t.staff.pickPortal : t.staff.demoLabel}
          </AppText>
          <View style={styles.demoRow}>
            {demos.map(([role, label]) => (
              <Pressable
                key={role}
                accessibilityRole="button"
                onPress={() => logIn(role)}
                style={[styles.demoChip, { borderColor: colors.borderDefault }]}
              >
                <AppText variant="caption" weight="semibold" tone="secondary">
                  {label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      }
    >
      <View style={styles.hero}>
        <Logo size={84} />
        <AppText variant="headingLarge" align="center">
          {t.staff.portal}
        </AppText>
        <AppText variant="label" weight="regular" tone="secondary" align="center">
          {t.staff.portalHint}
        </AppText>
      </View>
      <TextField
        label={t.staff.email}
        required
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label={t.auth.password}
        required
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button label={t.staff.logIn} onPress={() => logIn()} disabled={busy} style={styles.cta} />
      <View style={[styles.note, { backgroundColor: colors.brandPrimarySoft }]}>
        <Icon name="briefcase" size={18} color={colors.brandPrimary} />
        <AppText variant="captionStrong" style={styles.flex}>
          {t.staff.roleNote}
        </AppText>
      </View>
      <AppText variant="tiny" weight="regular" tone="secondary">
        {t.staff.ssoNote}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 6, marginTop: 8 },
  cta: { marginTop: 8 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  demo: { gap: 8 },
  demoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  demoChip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
