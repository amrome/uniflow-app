import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  LinearTransition,
  ZoomIn,
} from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

type BoxProps = { children: ReactNode; style?: StyleProp<ViewStyle> };

/**
 * Fades in while rising a few pixels. Give list items their position as `index` and they appear one
 * after another (50 ms apart, capped so a long list never makes anyone wait).
 */
export function Reveal({ index = 0, children, style }: BoxProps & { index?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(320)} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Pops in with a small spring and a success buzz, for the "done" moments (order placed, spot
 * reserved).
 */
export function PopIn({ children, style, delay = 120 }: BoxProps & { delay?: number }) {
  useEffect(() => {
    const id = setTimeout(haptic.success, delay);
    return () => clearTimeout(id);
  }, [delay]);
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify().damping(11)} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * A list row that fades in when added, fades out when removed, and lets the rows around it glide
 * to their new places (cart lines, "Your tickets").
 */
export function AnimatedItem({ children, style }: BoxProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition.duration(220)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** The dialog card eases in (a small zoom) on top of the dimmed backdrop. */
export function DialogIn({ children, style }: BoxProps) {
  return (
    <Animated.View entering={ZoomIn.duration(200)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Toast banner: drops in with a soft spring, leaves quickly (exits are shorter than entrances). */
export const toastEntering = FadeInUp.springify().damping(15);
export const toastExiting = FadeOutUp.duration(200);
