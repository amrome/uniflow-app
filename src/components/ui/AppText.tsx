import { Text, type TextProps } from 'react-native';

import { typography, useTheme, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  tone?: 'primary' | 'secondary' | 'brand' | 'onBrand' | 'error';
};

export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: Props) {
  const { colors } = useTheme();
  const color = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    brand: colors.brandPrimary,
    onBrand: colors.textOnBrand,
    error: colors.statusError,
  }[tone];
  return <Text {...rest} style={[typography[variant], { color }, style]} />;
}
