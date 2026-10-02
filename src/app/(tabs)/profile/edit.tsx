import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, LangToggle, Screen, TextField, TopBar } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { live } from '@/services/backend';
import { reportError } from '@/services/errors';
import { getProfile, updateProfile } from '@/services/profile';
import { useTheme } from '@/theme';

// Figma 12.2 · Edit Profile
export default function EditProfile() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    getProfile()
      .then((p) => {
        setFullName(p.fullName);
        setPhone(p.phone);
        setEmail(p.email);
        setStudentId(p.studentId);
      })
      .catch(reportError);
  }, []);

  const onSave = async () => {
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim(), email: email.trim() });
    } catch (e) {
      reportError(e);
      return;
    }
    toast.show({ emoji: '✅', title: t.profile.saved_toast, body: t.profile.saved_toast_body });
    router.back();
  };

  return (
    <Screen
      header={<TopBar title={t.profile.editTitle} boxedBack right={<LangToggle />} />}
      footer={
        <Button label={t.common.save} onPress={onSave} disabled={fullName.trim().length === 0} />
      }
      gap={14}
    >
      <View style={styles.photo}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
          ]}
        >
          <AppText size={40}>👤</AppText>
          <View
            style={[
              styles.camera,
              { backgroundColor: colors.brandPrimary, borderColor: colors.backgroundPrimary },
            ]}
          >
            <AppText size={13}>📷</AppText>
          </View>
        </View>
        <Pressable accessibilityRole="button" hitSlop={8}>
          <AppText variant="label" tone="brand">
            {t.profile.changePhoto}
          </AppText>
        </Pressable>
      </View>
      <TextField
        label={t.profile.fullName}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <TextField
        label={t.common.phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextField
        label={t.common.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!live} // with a backend the e-mail is the login, managed by the university
      />
      <View>
        <TextField label={t.profile.studentId} value={studentId} editable={false} />
        <AppText style={styles.lock} accessibilityLabel={t.profile.locked}>
          🔒
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: 'center', gap: 10, marginVertical: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    position: 'absolute',
    bottom: -2,
    end: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: { position: 'absolute', end: 16, bottom: 14 },
});
