import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { AppText, Button, LangToggle, Screen, TextField, TopBar } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { errorMessage } from '@/services/errors';
import { useSession } from '@/services/session';
import { layout } from '@/theme';

// New student / guest account. A @yu.edu.sa email becomes a student; anything else a guest.
export default function SignUp() {
  const { t } = useI18n();
  const router = useRouter();
  const { signUp } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = name.trim().length > 1 && email.includes('@') && password.length >= 6;

  const submit = async () => {
    setBusy(true);
    try {
      const result = await signUp(name.trim(), email.trim(), password);
      if (result === 'signedIn') {
        router.replace('/');
      } else {
        Alert.alert(t.auth.checkEmailTitle, fmt(t.auth.checkEmailBody, { email: email.trim() }));
        router.replace('/login');
      }
    } catch (e) {
      Alert.alert(t.auth.signUpTitle, errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<TopBar title={t.auth.signUpTitle} boxedBack right={<LangToggle />} />}
      gutter={layout.authGutter}
      gap={16}
    >
      <AppText variant="caption" tone="secondary">
        {t.auth.signUpNote}
      </AppText>
      <TextField
        label={t.auth.fullName}
        required
        placeholder={t.auth.namePlaceholder}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
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
        placeholder={t.auth.passwordHint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button label={t.auth.createAccountButton} onPress={submit} disabled={!valid || busy} />
      <Pressable accessibilityRole="link" onPress={() => router.replace('/login')}>
        <AppText variant="label" tone="brand" align="center">
          {t.auth.haveAccount}
        </AppText>
      </Pressable>
    </Screen>
  );
}
