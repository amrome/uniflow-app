import { useState } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { haptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How small it gets while pressed (1 = no change). */
  scaleTo?: number;
  /** Haptic on press: a light tap, a selection tick, or none. */
  feedback?: 'tap' | 'select' | 'none';
};

/** Pressable that shrinks slightly while held (100 ms in, 140 ms out) so every tap gives feedback. */
export function PressableScale({
  style,
  scaleTo = 0.97,
  feedback = 'tap',
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (value: number, duration: number) =>
    Animated.timing(scale, { toValue: value, duration, useNativeDriver: true }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPress={
        onPress &&
        ((e: GestureResponderEvent) => {
          if (feedback !== 'none') haptic[feedback]();
          onPress(e);
        })
      }
      onPressIn={(e: GestureResponderEvent) => {
        to(scaleTo, 100);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        to(1, 140);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
