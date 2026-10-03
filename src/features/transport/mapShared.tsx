import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n';
import { fontFamily, useTheme } from '@/theme';

import {
  CAMPUS_BUILDINGS,
  MAP_STYLE_DARK,
  MAP_STYLE_LIGHT,
  PLACES,
  type Place,
} from './campusMapData';

// Light or dark basemap to match the app theme.
export function useMapStyle(): string {
  const { isDark } = useTheme();
  return isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
}

// The 3D look: every OpenStreetMap building extruded in a quiet neutral, plus our own hand-drawn
// campus buildings in brand orange (rendered a metre taller so they never flicker against the
// OSM building underneath).
export function BuildingLayers() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <Layer
        id="osm-buildings-3d"
        type="fill-extrusion"
        source="openmaptiles"
        source-layer="building"
        minzoom={14}
        style={{
          fillExtrusionColor: isDark ? '#3B3B40' : '#E3DED7',
          fillExtrusionHeight: ['get', 'render_height'],
          fillExtrusionBase: ['get', 'render_min_height'],
          fillExtrusionOpacity: 0.92,
        }}
      />
      <GeoJSONSource id="campus-buildings" data={CAMPUS_BUILDINGS}>
        <Layer
          id="campus-buildings-3d"
          type="fill-extrusion"
          source="campus-buildings"
          style={{
            fillExtrusionColor: colors.brandPrimary,
            fillExtrusionHeight: ['+', ['to-number', ['get', 'height'], 12], 1],
            fillExtrusionBase: 0,
            fillExtrusionOpacity: 0.95,
          }}
        />
      </GeoJSONSource>
    </>
  );
}

// Campus and SAB Station pins. React Native views, so the labels use the app font and follow
// the selected language.
export function PlaceMarkers({
  places = PLACES,
  compact = false,
}: {
  places?: Place[];
  compact?: boolean;
}) {
  const { language } = useI18n();
  const { colors } = useTheme();
  return (
    <>
      {places.map((p) => (
        <Marker key={p.id} id={p.id} lngLat={p.lngLat} anchor="bottom">
          <View style={styles.marker}>
            <View style={[styles.pill, { backgroundColor: colors.inkPrimary }]}>
              <Text style={[styles.pillText, compact && styles.pillTextSmall]} numberOfLines={1}>
                {p[language]}
              </Text>
            </View>
            <View
              style={[
                styles.dot,
                { backgroundColor: p.id === 'sab' ? colors.inkPrimary : colors.brandPrimary },
              ]}
            />
          </View>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  marker: { alignItems: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, maxWidth: 170 },
  pillText: { color: '#FFFFFF', fontSize: 11, fontFamily: fontFamily.bold },
  pillTextSmall: { fontSize: 9 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginTop: 3,
  },
});
