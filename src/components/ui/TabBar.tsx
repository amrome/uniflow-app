import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icons';
import { shadows, useTheme } from '@/theme';

import { AppText } from './AppText';

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
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const color = focused ? colors.brandPrimary : colors.textSecondary;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
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
});
