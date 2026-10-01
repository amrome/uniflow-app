import Svg, { Path } from 'react-native-svg';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

import { iconPaths, type IconName } from './paths';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Mirror horizontally in Arabic (chevrons, arrows). */
  flipRTL?: boolean;
  fill?: string;
};

export function Icon({ name, size = 24, color, strokeWidth = 2, flipRTL, fill = 'none' }: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const stroke = color ?? colors.textPrimary;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={flipRTL && isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {iconPaths[name].map((p: { d: string; cap?: 'butt' | 'round'; join?: 'miter' | 'round' }) => (
        <Path
          key={p.d}
          d={p.d}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap={p.cap ?? 'round'}
          strokeLinejoin={p.join ?? 'round'}
        />
      ))}
    </Svg>
  );
}

export type { IconName };
