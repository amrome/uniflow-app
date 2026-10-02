import { Stack } from 'expo-router';

import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

export default function StaffLayout() {
  const { colors } = useTheme();
  const { session } = useSession();
  const staff = !!session && session.role !== 'student' && session.role !== 'guest';
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundPrimary },
      }}
    >
      {/* Same idea as the root layout: once signed in, the staff login can't be swiped back to. */}
      <Stack.Protected guard={!staff}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={staff}>
        <Stack.Screen name="instructor" options={{ gestureEnabled: false }} />
        <Stack.Screen name="club" options={{ gestureEnabled: false }} />
        <Stack.Screen name="admin" options={{ gestureEnabled: false }} />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="event-editor" />
        <Stack.Screen name="shuttle-editor" />
      </Stack.Protected>
    </Stack>
  );
}
