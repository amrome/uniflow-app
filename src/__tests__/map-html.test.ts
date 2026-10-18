import { CAMPUS_BUILDINGS, CAMPUS_VIEW_CENTER } from '@/features/transport/campusMapData';
import {
  buildMapHtml,
  MAPLIBRE_CSS,
  MAPLIBRE_JS,
  type MapHtmlConfig,
} from '@/features/transport/mapHtml';

const base: MapHtmlConfig = {
  styleUrl: 'https://tiles.openfreemap.org/styles/positron',
  center: CAMPUS_VIEW_CENTER,
  zoom: 16.2,
  pitch: 55,
  bearing: 20,
  interactive: true,
  compact: false,
  brand: '#F68938',
  ink: '#0B0B0C',
  osmBuildingColor: '#E3DED7',
  background: '#F2EFEA',
  places: [{ id: 'campus', label: 'Al-Yamamah University', lngLat: [46.59, 24.86], dot: 'brand' }],
  buildings: CAMPUS_BUILDINGS,
  language: 'en',
  attributionBottom: 0,
  offlineText: 'The map needs an internet connection.',
};

describe('map web page', () => {
  it('loads pinned MapLibre files and the OpenFreeMap style', () => {
    const html = buildMapHtml(base);
    expect(html).toContain(MAPLIBRE_JS);
    expect(html).toContain(MAPLIBRE_CSS);
    expect(MAPLIBRE_JS).toMatch(/maplibre-gl@\d+\.\d+\.\d+\//);
    expect(html).toContain('https://tiles.openfreemap.org/styles/positron');
  });

  it('embeds all campus buildings and the extrusion layers', () => {
    const html = buildMapHtml(base);
    expect(html).toContain('"name":"Main Library"');
    expect(html).toContain("type: 'fill-extrusion'");
    expect(html).toContain("'source-layer': 'building'");
  });

  it('passes the interactive flag through', () => {
    expect(buildMapHtml({ ...base, interactive: false })).toContain('"interactive":false');
  });

  it('cannot be broken out of the script tag by text in the data', () => {
    const html = buildMapHtml({
      ...base,
      places: [
        { id: 'x', label: '</script><img src=x onerror=alert(1)>', lngLat: [0, 0], dot: 'ink' },
      ],
    });
    expect(html).not.toContain('</script><img');
    expect(html).toContain('\\u003c/script\\u003e');
  });
});
