// Builds the small web page that draws the 3D map inside the React Native WebView.
//
// Why a web page: MapLibre's native React Native library cannot run in Expo Go, but MapLibre GL JS
// runs in any browser, and Expo Go ships a WebView. Same free OpenFreeMap tiles, same 3D look.
// The page needs an internet connection (it loads MapLibre GL JS from a CDN and the map tiles).

import type { FeatureCollection } from 'geojson';

export const MAPLIBRE_VERSION = '5.24.0';
export const MAPLIBRE_JS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
export const MAPLIBRE_CSS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

// The page is loaded as an HTML string under this fake origin; links that leave it open outside.
export const MAP_BASE_URL = 'https://uniflow.local/';

export type MapHtmlPlace = {
  id: string;
  label: string;
  lngLat: [number, number];
  dot: 'brand' | 'ink';
};

export type MapHtmlConfig = {
  styleUrl: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  /** false = a picture only: no pan, zoom, rotate or tilt. */
  interactive: boolean;
  /** Smaller pin labels, for the little preview card. */
  compact: boolean;
  brand: string;
  ink: string;
  osmBuildingColor: string;
  background: string;
  places: MapHtmlPlace[];
  buildings: FeatureCollection;
  /** 'en' or 'ar' — picks name vs name_ar for building labels. */
  language: string;
  /** Lifts the map credit above a bottom sheet. */
  attributionBottom: number;
  offlineText: string;
};

// JSON that is safe to place inside a <script> tag.
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028))
    .join('\\u2028')
    .split(String.fromCharCode(0x2029))
    .join('\\u2029');
}

export function buildMapHtml(config: MapHtmlConfig): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${MAPLIBRE_CSS}" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: ${config.background}; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, "Noto Sans Arabic", sans-serif; }
  .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left { margin-bottom: ${config.attributionBottom}px; }
  .pin { display: flex; flex-direction: column; align-items: center; pointer-events: none; }
  .pill { color: #fff; font-weight: 700; font-size: ${config.compact ? 9 : 11}px; line-height: 1.2; padding: 3px 8px; border-radius: 8px; max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dot { width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; margin-top: 3px; box-sizing: border-box; }
  #offline { display: none; position: absolute; inset: 0; align-items: center; justify-content: center; text-align: center; padding: 24px; color: #6B6560; font-size: 13px; }
</style>
</head>
<body>
<div id="map"></div>
<div id="offline"></div>
<script src="${MAPLIBRE_JS}"></script>
<script>
(function () {
  var C = ${safeJson(config)};

  function post(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  if (!window.maplibregl) {
    var box = document.getElementById('offline');
    box.textContent = C.offlineText;
    box.style.display = 'flex';
    post({ type: 'error', message: 'maplibre-gl failed to load' });
    return;
  }

  var map = new maplibregl.Map({
    container: 'map',
    style: C.styleUrl,
    center: C.center,
    zoom: C.zoom,
    pitch: C.pitch,
    bearing: C.bearing,
    minZoom: 11,
    maxZoom: 19,
    maxPitch: 70,
    interactive: C.interactive,
    attributionControl: { compact: true }
  });

  map.on('load', function () {
    // Every OpenStreetMap building, extruded. Shapes exist in the tiles from zoom 14.
    map.addLayer({
      id: 'osm-buildings-3d',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': C.osmBuildingColor,
        'fill-extrusion-height': ['get', 'render_height'],
        'fill-extrusion-base': ['get', 'render_min_height'],
        'fill-extrusion-opacity': 0.92
      }
    });

    // Our hand-drawn campus buildings in brand orange, a metre taller so they never flicker
    // against the OpenStreetMap building underneath.
    map.addSource('campus-buildings', { type: 'geojson', data: C.buildings });
    map.addLayer({
      id: 'campus-buildings-3d',
      type: 'fill-extrusion',
      source: 'campus-buildings',
      paint: {
        'fill-extrusion-color': C.brand,
        'fill-extrusion-height': ['+', ['to-number', ['get', 'height'], 12], 1],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.95
      }
    });

    // Building name labels: compute a centroid for each polygon, then show a text label.
    var labelFeatures = C.buildings.features
      .filter(function (f) { return f.properties && (f.properties.name || f.properties.name_ar); })
      .map(function (f) {
        var coords = f.geometry.coordinates[0];
        var lng = 0, lat = 0;
        for (var i = 0; i < coords.length - 1; i++) { lng += coords[i][0]; lat += coords[i][1]; }
        lng /= (coords.length - 1);
        lat /= (coords.length - 1);
        var label = C.language === 'ar' ? (f.properties.name_ar || f.properties.name) : f.properties.name;
        return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { label: label || '' } };
      });

    map.addSource('building-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: labelFeatures } });
    map.addLayer({
      id: 'building-labels',
      type: 'symbol',
      source: 'building-labels',
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Bold', 'Noto Sans Arabic Bold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-anchor': 'center',
        'text-offset': [0, -1.2],
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-max-width': 8
      },
      paint: {
        'text-color': '#fff',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.5
      }
    });

    post({ type: 'ready' });
  });

  map.on('error', function (e) {
    post({ type: 'error', message: String((e && e.error && e.error.message) || 'map error') });
  });

  C.places.forEach(function (p) {
    var el = document.createElement('div');
    el.className = 'pin';
    var pill = document.createElement('div');
    pill.className = 'pill';
    pill.setAttribute('dir', 'auto');
    pill.style.background = C.ink;
    pill.textContent = p.label;
    var dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = p.dot === 'brand' ? C.brand : C.ink;
    el.appendChild(pill);
    el.appendChild(dot);
    new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(p.lngLat).addTo(map);
  });

  // Commands from the app (see CampusWebMap.tsx).
  window.__flyTo = function (lng, lat, zoom) {
    map.flyTo({ center: [lng, lat], zoom: zoom, pitch: C.pitch, bearing: C.bearing, duration: 1400, essential: true });
  };
  window.__zoomBy = function (delta) {
    var z = Math.min(19, Math.max(11, map.getZoom() + delta));
    map.easeTo({ zoom: z, duration: 250 });
  };
})();
</script>
</body>
</html>`;
}
