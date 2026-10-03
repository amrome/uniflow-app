/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// MapLibre is a native module; render plain views in tests instead.
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Box = ({ children }) => React.createElement(View, null, children);
  return { Map: Box, Camera: () => null, Layer: () => null, GeoJSONSource: Box, Marker: Box };
});
