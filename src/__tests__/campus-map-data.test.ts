import {
  CAMPUS_BUILDINGS,
  CAMPUS_CENTER,
  MAP_STYLE_DARK,
  MAP_STYLE_LIGHT,
  PLACES,
  SAB_STATION,
} from '@/features/transport/campusMapData';

// Haversine distance in km.
function km(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

describe('campus map data', () => {
  it('stores coordinates as [longitude, latitude] inside Riyadh', () => {
    for (const [lng, lat] of [CAMPUS_CENTER, SAB_STATION]) {
      expect(lng).toBeGreaterThan(46);
      expect(lng).toBeLessThan(47.5);
      expect(lat).toBeGreaterThan(24);
      expect(lat).toBeLessThan(25.5);
    }
  });

  it('keeps the campus and SAB Station a few kilometres apart', () => {
    const d = km(CAMPUS_CENTER, SAB_STATION);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(8);
  });

  it('has an English and Arabic name for every place', () => {
    expect(PLACES.map((p) => p.id)).toEqual(['campus', 'sab']);
    for (const p of PLACES) {
      expect(p.en).toBeTruthy();
      expect(p.ar).toBeTruthy();
    }
  });

  it('only contains valid, closed building polygons near the campus', () => {
    for (const f of CAMPUS_BUILDINGS.features) {
      const ring = f.geometry.coordinates[0];
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
      for (const [lng, lat] of ring) expect(km([lng, lat], CAMPUS_CENTER)).toBeLessThan(1.5);
      expect(Number(f.properties?.height ?? 12)).toBeGreaterThan(0);
    }
  });

  it('uses the OpenFreeMap styles', () => {
    expect(MAP_STYLE_LIGHT).toMatch(/^https:\/\/tiles\.openfreemap\.org\/styles\//);
    expect(MAP_STYLE_DARK).toMatch(/^https:\/\/tiles\.openfreemap\.org\/styles\//);
  });
});
