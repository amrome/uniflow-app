import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { CampusWebMap, type CampusWebMapRef } from '@/features/transport/CampusWebMap';
import { VehicleSheet } from '@/features/transport/VehicleSheet';
import {
  CAMPUS_BUILDINGS,
  CAMPUS_VIEW_CENTER,
  PLACES,
  SAB_STATION,
  type LngLat,
} from '@/features/transport/campusMapData';
import {
  getRoutes,
  onVehicleUpdate,
  startTracking,
  stopTracking,
  type Vehicle,
} from '@/features/transport/vehicleTracking';
import { fmt, useI18n } from '@/i18n';
import { fontFamily, typography, useTheme } from '@/theme';

// Real 3D campus map: OpenFreeMap tiles drawn by MapLibre GL JS inside a WebView, with every
// building extruded. Works in Expo Go; needs an internet connection.

// Things the search box can jump to: the two pins plus any hand-drawn campus building.
type SearchTarget = { en: string; ar: string; center: LngLat };

function ringCenter(ring: number[][]): LngLat {
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
  const insets = useSafeAreaInsets();
  const mapRef = useRef<CampusWebMapRef>(null);
  const [query, setQuery] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => startTracking());
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const routesDrawn = useRef(false);

  // ── Draggable bottom sheet ──────────────────────────────────────────────────
  const screenH = Dimensions.get('window').height;
  const SHEET_PEEK = 280; // collapsed height
  const SHEET_MAX = screenH * 0.65; // expanded height
  const [sheetY] = useState(() => new Animated.Value(0));
  const lastY = useRef(0);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          sheetY.setOffset(lastY.current);
          sheetY.setValue(0);
        },
        onPanResponderMove: (_, g) => {
          // negative dy = dragging up (expand), positive = dragging down (collapse)
          const raw = lastY.current + g.dy;
          const clamped = Math.min(0, Math.max(-(SHEET_MAX - SHEET_PEEK), raw));
          sheetY.setOffset(0);
          sheetY.setValue(clamped);
        },
        onPanResponderRelease: (_, g) => {
          sheetY.flattenOffset();
          const current = lastY.current + g.dy;
          const mid = -(SHEET_MAX - SHEET_PEEK) / 2;
          // Snap: if past halfway or fast flick, expand; otherwise collapse
          const expand = g.vy < -0.5 || (g.vy <= 0.5 && current < mid);
          const target = expand ? -(SHEET_MAX - SHEET_PEEK) : 0;
          lastY.current = target;
          Animated.spring(sheetY, {
            toValue: target,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        },
      }),
    [sheetY, SHEET_MAX, SHEET_PEEK],
  );

  // Subscribe to position updates; stop on unmount.
  useEffect(() => {
    const unsub = onVehicleUpdate((updated) => {
      setVehicles(updated);
      mapRef.current?.updateVehicles(updated);

      // Keep the selected vehicle's data fresh.
      setSelectedVehicle((prev) => {
        if (!prev) return null;
        return updated.find((v) => v.id === prev.id) ?? null;
      });
    });

    return () => {
      unsub();
      stopTracking();
    };
  }, []);

  // Once the map is ready and we have vehicles, send initial data and draw routes.
  useEffect(() => {
    if (vehicles.length > 0 && mapRef.current) {
      mapRef.current.updateVehicles(vehicles);
      if (!routesDrawn.current) {
        mapRef.current.drawRoutes(getRoutes());
        routesDrawn.current = true;
      }
    }
  }, [vehicles]);

  const handleVehicleTap = useCallback(
    (id: string) => {
      const v = vehicles.find((veh) => veh.id === id);
      if (v) {
        setSelectedVehicle(v);
        mapRef.current?.flyTo(v.position, 17);
      }
    },
    [vehicles],
  );

  const search = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = searchTargets.find((x) => x.en.toLowerCase().includes(q) || x.ar.includes(q));
    if (hit) flyTo(hit.center, 17);
  };

  const flyTo = (center: LngLat, zoom?: number) => mapRef.current?.flyTo(center, zoom);
  const zoomBy = (delta: number) => mapRef.current?.zoomBy(delta);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <CampusWebMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        attributionBottom={selectedVehicle ? 320 : 250}
        onVehicleTap={handleVehicleTap}
      />

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

      {/* Vehicle detail popup — shown when a marker is tapped */}
      {selectedVehicle ? (
        <VehicleSheet vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      ) : (
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.backgroundPrimary,
              paddingBottom: insets.bottom + 12,
              height: SHEET_MAX,
              bottom: -(SHEET_MAX - SHEET_PEEK),
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={[styles.grabber, { backgroundColor: colors.borderDefault }]} />
            <View style={styles.sheetHead}>
              <AppText variant="bodyStrong" weight="bold" size={16}>
                {t.transport.liveVehicles}
              </AppText>
              <View style={styles.trackedDot} />
              <AppText variant="caption" tone="secondary">
                {fmt(t.transport.tracked, { n: vehicles.length })}
              </AppText>
            </View>
          </View>
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              accessibilityRole="button"
              onPress={() => handleVehicleTap(v.id)}
              style={[styles.vehicle, { backgroundColor: colors.backgroundSurface }]}
            >
              <View style={[styles.vehicleIcon, { backgroundColor: v.color }]}>
                <Text style={{ fontSize: 15 }}>{v.type === 'bus' ? '🚌' : '🛺'}</Text>
              </View>
              <View style={styles.flex}>
                <AppText variant="bodySmall" weight="semibold">
                  {v.name[language]}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {v.near[language]}
                </AppText>
              </View>
              <View>
                <AppText variant="label" weight="bold" tone="brand">
                  {fmt(t.transport.minutesAway, { n: v.etaMin })}
                </AppText>
              </View>
            </Pressable>
          ))}
        </Animated.View>
      )}
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
