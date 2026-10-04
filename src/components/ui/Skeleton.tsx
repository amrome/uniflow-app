import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/** A grey placeholder block that gently pulses while real content loads. */
export function Skeleton({
  height,
  width = '100%',
  radius = 14,
  style,
}: {
  height: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.7));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        { height, width, borderRadius: radius, backgroundColor: colors.backgroundSurface },
        { opacity: pulse },
        style,
      ]}
    />
  );
}
