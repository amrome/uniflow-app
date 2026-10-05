import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon, Logo } from '@/components/icons';
import { AppText, Button, LangToggle, Screen, TextField } from '@/components/ui';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/services/errors';
import { useSession } from '@/services/session';
import { layout, useTheme } from '@/theme';

// Figma 01 · Login
export default function Login() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { signInStudent } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const logIn = async () => {
    setBusy(true);
    try {
      await signInStudent(email.trim(), password);
      router.replace('/'); // the entry screen sends each role to its own home
    } catch (e) {
      Alert.alert(t.auth.logIn, errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen gutter={layout.authGutter} gap={20}>
      <View style={styles.toggleRow}>
        <LangToggle />
      </View>
      <View style={styles.hero}>
        <Logo size={84} />
        <AppText variant="display" align="center">
          {t.auth.welcome}
        </AppText>
        <AppText tone="secondary" align="center">
          {t.auth.tagline}
        </AppText>
      </View>
      <TextField
        label={t.common.email}
        required
        placeholder={t.auth.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextField
        label={t.auth.password}
        required
        placeholder="••••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button label={t.auth.logIn} onPress={logIn} disabled={busy} />
      <View style={styles.divider}>
        <View style={[styles.rule, { backgroundColor: colors.borderDefault }]} />
        <AppText variant="label" weight="regular" tone="secondary">
          {t.common.or}
        </AppText>
        <View style={[styles.rule, { backgroundColor: colors.borderDefault }]} />
      </View>
      <Button
        label={t.auth.continueAsGuest}
        variant="secondary"
        onPress={() => router.push('/register')}
      />
      <AppText variant="caption" tone="secondary" align="center">
        {t.auth.guestHint}
      </AppText>
      <Pressable accessibilityRole="link" onPress={() => router.push('/signup')}>
        <AppText variant="label" tone="brand" align="center">
          {t.auth.newHere} {t.auth.createAccount}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/staff/login')}
        style={styles.staff}
      >
        <Icon name="briefcase" size={14} color={colors.textSecondary} />
        <AppText variant="label" tone="secondary">
          {t.auth.staffLogin}
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', marginEnd: -20 },
  hero: { alignItems: 'center', gap: 20, marginTop: 60, marginBottom: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1 },
  staff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
});
