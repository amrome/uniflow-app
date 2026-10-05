import { useCallback, useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

import {
  CAMPUS_BEARING,
  CAMPUS_BUILDINGS,
  CAMPUS_PITCH,
  CAMPUS_VIEW_CENTER,
  CAMPUS_ZOOM,
  MAP_STYLE_DARK,
  MAP_STYLE_LIGHT,
  PLACES,
  type LngLat,
  type Place,
} from './campusMapData';
import { buildMapHtml, MAP_BASE_URL } from './mapHtml';
import type { Vehicle } from './vehicleTracking';

export type CampusWebMapRef = {
  /** Smoothly move the camera (keeps the tilt) to a point, optionally at a given zoom. */
  flyTo: (center: LngLat, zoom?: number) => void;
  /** Zoom in (positive) or out (negative) by a number of levels. */
  zoomBy: (delta: number) => void;
  /** Send vehicle positions to the map. */
  updateVehicles: (vehicles: Vehicle[]) => void;
  /** Draw route polylines on the map (call once). */
  drawRoutes: (routes: { id: string; type: string; color: string; path: LngLat[] }[]) => void;
};

type Props = {
  /** false = a still picture (the preview card); true = pan, zoom, rotate and tilt with fingers. */
  interactive?: boolean;
  compact?: boolean;
  places?: Place[];
  zoom?: number;
  /** Keeps the map credit visible above a bottom sheet. */
  attributionBottom?: number;
  /** Called when a vehicle marker is tapped. */
  onVehicleTap?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<CampusWebMapRef>;
};

// The 3D campus map: a MapLibre GL JS page inside a WebView (works in Expo Go, needs internet).
export function CampusWebMap({
  interactive = true,
  compact = false,
  places = PLACES,
  zoom = CAMPUS_ZOOM,
  attributionBottom = 0,
  onVehicleTap,
  style,
  ref,
}: Props) {
  const { language, t } = useI18n();
  const { colors, isDark } = useTheme();
  const webRef = useRef<WebView>(null);

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (center, z = CAMPUS_ZOOM) =>
        webRef.current?.injectJavaScript(
          `window.__flyTo && window.__flyTo(${center[0]}, ${center[1]}, ${z}); true;`,
        ),
      zoomBy: (delta) =>
        webRef.current?.injectJavaScript(`window.__zoomBy && window.__zoomBy(${delta}); true;`),
      updateVehicles: (vList) =>
        webRef.current?.postMessage(JSON.stringify({ type: 'vehicles', vehicles: vList })),
      drawRoutes: (routes) =>
        webRef.current?.postMessage(JSON.stringify({ type: 'routes', routes })),
    }),
    [],
  );

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.type === 'vehicleTap' && onVehicleTap) onVehicleTap(msg.id);
      } catch {
        // ignore
      }
    },
    [onVehicleTap],
  );

  // Rebuilt (and the page reloaded) only when the theme or language changes.
  const html = useMemo(
    () =>
      buildMapHtml({
        styleUrl: isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
        center: CAMPUS_VIEW_CENTER,
        zoom,
        pitch: CAMPUS_PITCH,
        bearing: CAMPUS_BEARING,
        interactive,
        compact,
        brand: colors.brandPrimary,
        ink: colors.inkPrimary,
        osmBuildingColor: isDark ? '#3B3B40' : '#E3DED7',
        background: isDark ? '#121214' : '#F2EFEA',
        places: places.map((p) => ({
          id: p.id,
          label: p[language],
          lngLat: p.lngLat,
          dot: p.id === 'sab' ? 'ink' : 'brand',
        })),
        buildings: CAMPUS_BUILDINGS,
        language,
        attributionBottom,
        offlineText: t.transport.mapOffline,
      }),
    [
      isDark,
      language,
      interactive,
      compact,
      places,
      zoom,
      attributionBottom,
      colors.brandPrimary,
      colors.inkPrimary,
      t.transport.mapOffline,
    ],
  );

  // Taps on the map credit open the browser instead of navigating the map away.
  const onNavigate = (req: WebViewNavigation) => {
    if (req.url.startsWith(MAP_BASE_URL) || req.url.startsWith('about:')) return true;
    if (/^https?:/.test(req.url)) void Linking.openURL(req.url);
    return false;
  };

  return (
    <View style={[styles.fill, style]}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: MAP_BASE_URL }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={onNavigate}
        onMessage={onMessage}
        style={styles.web}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        setSupportMultipleWindows={false}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
});
