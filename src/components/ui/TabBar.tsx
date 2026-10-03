import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icons';
import { useI18n } from '@/i18n';
import { useSession } from '@/services/session';
import { shadows, useTheme } from '@/theme';

import { AppText } from './AppText';
import { requestSlideFromLeft } from './slideFromLeft';

const icons: Record<string, IconName> = {
  home: 'home',
  transport: 'bus',
  food: 'food',
  parking: 'parking',
  profile: 'user',
};

/** Figma NavBar/Default: 5 tabs, 24px icons, 11px labels, brand tint when active. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useSession();
  const guest = session?.role === 'guest';
  const tabStyle = [styles.tab, guest && styles.guestTab];
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.backgroundPrimary,
          borderTopColor: colors.borderDefault,
          paddingBottom: Math.max(insets.bottom, 12),
          boxShadow: isDark ? undefined : shadows.navBar,
        },
      ]}
    >
      {guest && (
        // The guest home lives outside the tabs, so it gets its own button (guests have no Home tab).
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityLabel={t.tabs.home}
          style={tabStyle}
          onPress={() => router.dismissTo('/guest')} // pops (slides back), never pushes a copy
        >
          <Icon name="home" color={colors.textSecondary} />
          <AppText variant="tiny" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {t.tabs.home}
          </AppText>
        </Pressable>
      )}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        // Tabs hidden for this user (`href: null`, e.g. student-only tabs for guests) get no button.
        // expo-router turns `href: null` into `tabBarItemStyle: { display: 'none' }`.
        if (StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') return null;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const color = focused ? colors.brandPrimary : colors.textSecondary;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={tabStyle}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                if (route.name === 'home') requestSlideFromLeft(); // Home slides in from the left
                navigation.navigate(route.name);
              }
            }}
          >
            <Icon name={icons[route.name] ?? 'home'} color={color} />
            <AppText variant="tiny" style={{ color }} numberOfLines={1}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  tab: { alignItems: 'center', gap: 4, minWidth: 56 },
  guestTab: { flex: 1 }, // 3 tabs share the bar evenly instead of hugging the edges
});
