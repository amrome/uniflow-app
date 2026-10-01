import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useSession } from '@/services/session';

export default function TabsLayout() {
  const { t } = useI18n();
  const { session } = useSession();
  // Guests only get food + transport; hide the student-only tabs.
  const guest = session?.role === 'guest';
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: t.tabs.home, href: guest ? null : undefined }} />
      <Tabs.Screen name="transport" options={{ title: t.tabs.transport }} />
      <Tabs.Screen name="food" options={{ title: t.tabs.food }} />
      <Tabs.Screen
        name="parking"
        options={{ title: t.tabs.parking, href: guest ? null : undefined }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t.tabs.profile, href: guest ? null : undefined }}
      />
    </Tabs>
  );
}
