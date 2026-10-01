import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { radius, shadows, useTheme } from '@/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ink' | 'danger' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: IconName;
  /** Content rendered at the trailing edge (e.g. a price). */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Figma Button/Primary + Button/Secondary (14px radius, 16px vertical padding). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  trailing,
  style,
}: Props) {
  const { colors } = useTheme();
  const look = {
    primary: { bg: colors.brandPrimary, fg: colors.textOnBrand, border: 'transparent' },
    secondary: {
      bg: colors.backgroundSurface,
      fg: colors.textPrimary,
      border: colors.borderDefault,
    },
    ink: { bg: colors.inkPrimary, fg: '#FFFFFF', border: 'transparent' },
    danger: { bg: colors.backgroundPrimary, fg: colors.statusError, border: colors.statusError },
    ghost: { bg: 'transparent', fg: colors.textPrimary, border: colors.borderDefault },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: look.bg,
          borderColor: look.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          boxShadow: variant === 'primary' && !disabled ? shadows.brandButton : undefined,
          justifyContent: trailing ? 'space-between' : 'center',
        },
        style,
      ]}
    >
      <View style={styles.labelRow}>
        {icon && <Icon name={icon} size={18} color={look.fg} />}
        <AppText variant="headingSmall" style={{ color: look.fg }}>
          {label}
        </AppText>
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 51,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
