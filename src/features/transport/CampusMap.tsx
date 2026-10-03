import { Camera, Map } from '@maplibre/maplibre-react-native';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import {
  CAMPUS_BEARING,
  CAMPUS_PITCH,
  CAMPUS_VIEW_CENTER,
  CAMPUS_ZOOM,
  PLACES,
} from './campusMapData';
import { BuildingLayers, PlaceMarkers, useMapStyle } from './mapShared';

// Small, non-interactive 3D preview of the campus. It sits on the Transportation
// screen; tapping it (handled by the parent) opens the full map at /transport/map.
export function CampusMap({ style }: { style?: ViewStyle }) {
  const mapStyle = useMapStyle();
  return (
    <View
      style={[styles.card, style]}
      // The map is decorative; screen readers get the cart list and shuttle card instead.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* pointerEvents none: every touch goes to the parent's Pressable, never the map. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={mapStyle}
          logo={false}
          compass={false}
          dragPan={false}
          touchZoom={false}
          doubleTapZoom={false}
          doubleTapHoldZoom={false}
          touchRotate={false}
          touchPitch={false}
        >
          <Camera
            initialViewState={{
              center: CAMPUS_VIEW_CENTER,
              zoom: CAMPUS_ZOOM - 0.4,
              pitch: CAMPUS_PITCH,
              bearing: CAMPUS_BEARING,
            }}
          />
          <BuildingLayers />
          <PlaceMarkers places={PLACES.filter((p) => p.id === 'campus')} compact />
        </Map>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 240, borderRadius: 18, overflow: 'hidden', direction: 'ltr' },
});
