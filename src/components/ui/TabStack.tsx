import { Stack } from 'expo-router';
import { createContext, useContext } from 'react';

import { useTheme } from '@/theme';

const InTabsContext = createContext(false);

/** True for screens rendered above the tab bar (it already pads for the home indicator). */
export function useInTabs() {
  return useContext(InTabsContext);
}

/** Stack navigator used inside every tab so the tab bar stays visible on sub-screens (as in Figma). */
export function TabStack() {
  const { colors } = useTheme();
  return (
    <InTabsContext.Provider value>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundPrimary },
        }}
      />
    </InTabsContext.Provider>
  );
}
