import * as Haptics from 'expo-haptics';

// Small physical taps that go with the animations. Never throws: devices without a haptic engine
// (and the web) simply do nothing.
const run = (fn: () => Promise<void>) => {
  try {
    fn().catch(() => {});
  } catch {
    // no haptics available
  }
};

export const haptic = {
  /** A light tap: buttons, cards. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A selection tick: tabs, filter chips. */
  select: () => run(() => Haptics.selectionAsync()),
  /** A success buzz: order placed, spot reserved. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
