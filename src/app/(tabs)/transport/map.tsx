import {
  Camera,
  Map,
  type CameraRef,
  type MapRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  CAMPUS_BEARING,
  CAMPUS_BUILDINGS,
  CAMPUS_VIEW_CENTER,
  CAMPUS_PITCH,
  CAMPUS_ZOOM,
  PLACES,
  SAB_STATION,
} from '@/features/transport/campusMapData';
import { BuildingLayers, PlaceMarkers, useMapStyle } from '@/features/transport/mapShared';
import { fmt, useI18n } from '@/i18n';
import { fontFamily, typography, useTheme } from '@/theme';

// Real 3D campus map: OpenFreeMap tiles drawn by MapLibre, with every building extruded. Needs a
// development build (see README), not Expo Go.

// Things the search box can jump to: the two pins plus any hand-drawn campus building.
type SearchTarget = { en: string; ar: string; center: [number, number] };

function ringCenter(ring: number[][]): [number, number] {
  const n = Math.max(ring.length - 1, 1); // the last point repeats the first
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return [x / n, y / n];
}

const searchTargets: SearchTarget[] = [
  ...PLACES.map((p) => ({ en: p.en, ar: p.ar, center: p.lngLat })),
  ...CAMPUS_BUILDINGS.features
    .filter((f) => !!f.properties?.name)
    .map((f) => ({
      en: f.properties.name as string,
      ar: f.properties.name_ar ?? (f.properties.name as string),
      center: ringCenter(f.geometry.coordinates[0]),
    })),
];

export default function CampusMap3D() {
  const { t, language, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const mapStyle = useMapStyle();
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const zoomRef = useRef(CAMPUS_ZOOM);
  const [query, setQuery] = useState('');

  const flyTo = (center: [number, number], zoom = CAMPUS_ZOOM) =>
    cameraRef.current?.flyTo({
      center,
      zoom,
      pitch: CAMPUS_PITCH,
      bearing: CAMPUS_BEARING,
      duration: 1400,
    });

  const search = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = searchTargets.find((x) => x.en.toLowerCase().includes(q) || x.ar.includes(q));
    if (hit) flyTo(hit.center, 17);
  };

  const zoomBy = (delta: number) =>
    cameraRef.current?.zoomTo(Math.min(19, Math.max(11, zoomRef.current + delta)), {
      duration: 250,
    });

  const vehicles = [
    {
      emoji: '🚌',
      bg: '#F58A38',
      name: t.transport.sabShuttle,
      near: t.transport.sabShuttleNear,
      eta: 4,
    },
    {
      emoji: '🛺',
      bg: '#2E7D33',
      name: t.transport.golfCart2,
      near: t.transport.golfCart2Near,
      eta: 2,
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        logo={false}
        compass
        attributionPosition={{ bottom: 250, left: 8 }}
        onRegionDidChange={(e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
          zoomRef.current = e.nativeEvent.zoom;
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: CAMPUS_VIEW_CENTER,
            zoom: CAMPUS_ZOOM,
            pitch: CAMPUS_PITCH,
            bearing: CAMPUS_BEARING,
          }}
          minZoom={11}
          maxZoom={19}
        />
        <BuildingLayers />
        <PlaceMarkers />
      </Map>

      <View style={[styles.topRow, { top: insets.top + 16 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          onPress={() => router.back()}
          style={styles.squareBtn}
        >
          <AppText size={22} weight="semibold" style={{ color: '#000' }}>
            {isRTL ? '›' : '‹'}
          </AppText>
        </Pressable>
        <View style={styles.search}>
          <Text>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder={t.transport.mapSearch}
            placeholderTextColor="#6B6560"
            style={[typography.label, styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>
        <View style={[styles.squareBtn, { backgroundColor: colors.brandPrimary }]}>
          <AppText variant="label" weight="bold" tone="onBrand">
            3D
          </AppText>
        </View>
      </View>

      <View style={[styles.controls, { top: insets.top + 74 }]}>
        <MapButton label="＋" a11y={t.transport.mapZoomIn} onPress={() => zoomBy(1)} />
        <MapButton label="－" a11y={t.transport.mapZoomOut} onPress={() => zoomBy(-1)} />
        <MapButton
          label="📍"
          a11y={t.transport.mapCampus}
          onPress={() => flyTo(CAMPUS_VIEW_CENTER)}
        />
        <MapButton label="🚇" a11y={t.transport.mapSabStation} onPress={() => flyTo(SAB_STATION)} />
      </View>

      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.backgroundPrimary, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.borderDefault }]} />
        <View style={styles.sheetHead}>
          <AppText variant="bodyStrong" weight="bold" size={16}>
            {t.transport.liveVehicles}
          </AppText>
          <View style={styles.trackedDot} />
          <AppText variant="caption" tone="secondary">
            {fmt(t.transport.tracked, { n: language === 'ar' ? '٢' : 2 })}
          </AppText>
        </View>
        {vehicles.map((v) => (
          <View
            key={v.name}
            style={[styles.vehicle, { backgroundColor: colors.backgroundSurface }]}
          >
            <View style={[styles.vehicleIcon, { backgroundColor: v.bg }]}>
              <Text style={{ fontSize: 15 }}>{v.emoji}</Text>
            </View>
            <View style={styles.flex}>
              <AppText variant="bodySmall" weight="semibold">
                {v.name}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {v.near}
              </AppText>
            </View>
            <View>
              <AppText variant="label" weight="bold" tone="brand">
                {fmt(t.transport.minutesAway, { n: v.eta })}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {t.transport.center}
              </AppText>
            </View>
          </View>
        ))}
        <Button
          label={t.transport.notifyNear}
          onPress={() =>
            toast.show({
              emoji: '🚌',
              title: t.transport.notifyToastTitle,
              body: t.transport.notifyToastBody,
            })
          }
        />
      </View>
    </View>
  );
}

function MapButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={styles.control}
    >
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8E4E0' },
  flex: { flex: 1 },
  topRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  squareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)',
  },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)',
  },
  searchInput: { flex: 1, color: '#000000', padding: 0, fontFamily: fontFamily.regular },
  controls: { position: 'absolute', right: 16, gap: 4 },
  control: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)',
  },
  controlText: { fontSize: 20, color: '#000000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
    boxShadow: '0px -4px 16px 0px rgba(0,0,0,0.1)',
  },
  grabber: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, marginBottom: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  trackedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D33', marginStart: 12 },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
  },
  vehicleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
