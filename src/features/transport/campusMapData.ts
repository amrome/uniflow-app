// Real-world data for the 3D campus map. Coordinates are [longitude, latitude] (GeoJSON order,
// the reverse of what Google Maps shows).
import type { LngLat } from '@maplibre/maplibre-react-native';

// Al-Yamamah University pin, from Google Maps.
export const CAMPUS_CENTER: LngLat = [46.5937941, 24.863473];

// SAB (SABB) metro station, Blue Line, from Google Maps.
export const SAB_STATION: LngLat = [46.6165493, 24.8295163];

export type Place = { id: 'campus' | 'sab'; en: string; ar: string; lngLat: LngLat };

export const PLACES: Place[] = [
  { id: 'campus', en: 'Al-Yamamah University', ar: 'جامعة اليمامة', lngLat: CAMPUS_CENTER },
  { id: 'sab', en: 'SAB Station', ar: 'محطة ساب', lngLat: SAB_STATION },
];

// Free vector tiles, no API key (openfreemap.org). Both styles ship the same `openmaptiles`
// source, so one extrusion layer works for light and dark.
export const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
export const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

// Building shapes only exist in the map tiles from about zoom 14, so the campus view sits at 16.
export const CAMPUS_ZOOM = 16.2;
export const CAMPUS_PITCH = 55;
export const CAMPUS_BEARING = 20;

// Campus buildings drawn by hand, shown in brand orange on top of the OpenStreetMap buildings.
// To add one: draw it at https://geojson.io (satellite view), give the polygon `name` (and
// optionally `name_ar`) and `height` (metres) properties, then paste the polygon's feature into
// `features` below. `height` may be a number or a string; both work.
export type CampusBuildingProps = { name?: string; name_ar?: string; height?: number | string };

export const CAMPUS_BUILDINGS: GeoJSON.FeatureCollection<GeoJSON.Polygon, CampusBuildingProps> = {
  type: 'FeatureCollection',
  features: [],
};
