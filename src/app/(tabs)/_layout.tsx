import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/ui';
import { ParkingCheck } from '@/features/parking/ParkingCheck';
import { useI18n } from '@/i18n';
import { useSession } from '@/services/session';

export default function TabsLayout() {
  const { t } = useI18n();
  const { session } = useSession();
  // Guests only get food + transport; hide the student-only tabs.
  const guest = session?.role === 'guest';
  return (
    // Default back behaviour jumps to the first tab (the student Home). A guest must never land
    // there, so for guests back just pops to the guest home.
    <>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
        backBehavior={guest ? 'none' : 'firstRoute'}
      >
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
      {/* "Are you still coming?" for a paid parking reservation, on whichever tab is open */}
      {!guest && <ParkingCheck />}
    </>
  );
}
