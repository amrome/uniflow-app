import { Text, type TextProps } from 'react-native';

import { useI18n } from '@/i18n';
import { fontFamily, typography, useTheme, type FontWeight, type TypographyVariant } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'brand' | 'onBrand' | 'error' | 'success';

type Props = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** Overrides the variant's weight. */
  weight?: FontWeight;
  /** Overrides the variant's size. */
  size?: number;
  align?: 'center' | 'start' | 'end';
};

export function AppText({
  variant = 'body',
  tone = 'primary',
  weight,
  size,
  align = 'start',
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const color = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    brand: colors.brandPrimary,
    onBrand: colors.textOnBrand,
    error: colors.statusError,
    success: colors.statusSuccess,
  }[tone];
  // `direction: rtl` on the root flips layout, but textAlign stays physical, so map start/end here.
  const start = isRTL ? 'right' : 'left';
  const end = isRTL ? 'left' : 'right';
  const textAlign = align === 'center' ? 'center' : align === 'end' ? end : start;
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color, textAlign },
        weight && { fontFamily: fontFamily[weight] },
        size !== undefined && { fontSize: size },
        style,
      ]}
    />
  );
}
