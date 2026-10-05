// "Go back" feel for a few navigations (logout, the student Home button): the next screen that
// gets focus slides in from the left instead of appearing. Native-stack options differ per platform,
// so this is done by hand in <Screen>. Ask for it right before navigating.
let requestedAt = 0;

export function requestSlideFromLeft() {
  requestedAt = Date.now();
}

/** True once per request, and only if the navigation happened soon after asking. */
export function consumeSlideFromLeft(): boolean {
  const fresh = Date.now() - requestedAt < 1500;
  requestedAt = 0;
  return fresh;
}
