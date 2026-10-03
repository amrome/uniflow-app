import { StyleSheet, View, type ViewStyle } from 'react-native';

import { CampusWebMap } from './CampusWebMap';
import { CAMPUS_ZOOM, PLACES } from './campusMapData';

const campusOnly = PLACES.filter((p) => p.id === 'campus');

// Small, still 3D preview of the campus. It sits on the Transportation screen; tapping it (handled
// by the parent) opens the full interactive map at /transport/map.
export function CampusMap({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[styles.card, style]}
      // The map is decorative; screen readers get the cart list and shuttle card instead.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* pointerEvents none: every touch goes to the parent's Pressable, never the web page. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <CampusWebMap interactive={false} compact places={campusOnly} zoom={CAMPUS_ZOOM - 0.4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 240, borderRadius: 18, overflow: 'hidden', direction: 'ltr' },
});
