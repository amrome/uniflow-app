/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The 3D map runs inside a WebView; render nothing for it in tests.
jest.mock('react-native-webview', () => ({ WebView: () => null }));
