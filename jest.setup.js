/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The 3D map runs inside a WebView; render nothing for it in tests.
jest.mock('react-native-webview', () => ({ WebView: () => null }));

// Entering/exiting animations (Reveal.tsx) need Reanimated's native runtime, which Jest does not
// have. Tests only need the children to render, so every wrapper becomes a plain View.
jest.mock('@/components/ui/Reveal', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Plain = ({ children, style }) => React.createElement(View, { style }, children);
  return {
    Reveal: Plain,
    PopIn: Plain,
    AnimatedItem: Plain,
    DialogIn: Plain,
    toastEntering: undefined,
    toastExiting: undefined,
  };
});

// No haptic engine in Jest.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
