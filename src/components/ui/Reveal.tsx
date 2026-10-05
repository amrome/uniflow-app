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
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      layout={LinearTransition.duration(160)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** The dialog card fades in quickly on top of the dimmed backdrop (no zoom, no bounce). */
export function DialogIn({ children, style }: BoxProps) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Toast banner: a short slide down with no bounce, and an even quicker exit. */
export const toastEntering = FadeInUp.duration(200);
export const toastExiting = FadeOutUp.duration(140);
