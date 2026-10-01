import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Screen, TextField } from '@/components/ui';
import { useI18n } from '@/i18n';
import { getProfile, updateProfile } from '@/services/profile';

export default function EditProfile() {
  const { t } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    getProfile().then((p) => {
      setFullName(p.fullName);
      setPhone(p.phone);
      setEmail(p.email);
      setStudentId(p.studentId);
    });
  }, []);

  const onSave = async () => {
    await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t.profile.editTitle }} />
      <TextField label={t.profile.fullName} value={fullName} onChangeText={setFullName} />
      <TextField
        label={t.common.phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextField label={t.common.email} value={email} editable={false} />
      <TextField label={t.profile.studentId} value={studentId} editable={false} />
      <Button label={t.common.save} onPress={onSave} disabled={fullName.trim().length === 0} />
    </Screen>
  );
}
