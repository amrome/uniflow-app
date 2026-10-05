# Uniflow

One app. Every campus need. React Native (Expo) app for Al Yamamah University students:
instructor schedules, food pre-ordering, parking, events, transportation and profile.

## Stack

Expo SDK 57 · React Native · TypeScript (strict) · expo-router · Jest · ESLint + Prettier

## Getting started

```bash
npm install
npm start        # scan the QR code with Expo Go
```

### Campus map

The Transportation tab shows a 3D map of campus and SAB Station. It is a
[MapLibre GL JS](https://maplibre.org) page inside a WebView, so it **works in Expo Go** but needs an
internet connection (it loads MapLibre from a CDN and the tiles from
[OpenFreeMap](https://openfreemap.org), free, no API key).

- `src/features/transport/campusMapData.ts`: campus and SAB Station coordinates, map styles, camera.
- `src/features/transport/campusBuildings.ts`: the hand-drawn campus buildings (orange). Heights
  are in metres. Every other building comes from OpenStreetMap.
- To add a building: draw it at [geojson.io](https://geojson.io) in satellite view, give it `name`,
  `name_ar` and `height` properties, and paste the feature into `campusBuildings.ts`.
- `mapHtml.ts` builds the web page, `CampusWebMap.tsx` is the React Native wrapper.

## Scripts

| Command                | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run start:tunnel` | Same as start, reachable from any network |
| `npm run typecheck`    | TypeScript, no emit                       |
| `npm run lint`         | ESLint                                    |
| `npm run format`       | Prettier                                  |
| `npm test`             | Jest                                      |
| `npm run test:db`      | SQL + RLS in PGlite                       |

## Structure

```
src/app         expo-router routes (one file per screen)
src/components  shared UI (src/components/ui)
src/features    feature-specific components and logic
src/theme       design tokens from Figma, light + dark
src/i18n        English + Arabic strings, RTL handling
src/services    data access (Supabase when .env keys are set, mocks otherwise)
supabase        SQL schema, seed, RPCs and tests (see supabase/README)
src/mocks       mock data
```

## Conventions

- Every screen ships in four variants: EN, AR (RTL), dark, dark AR. Colors come from
  `useTheme()`, strings from `useI18n()`; never hard-code either.
- Screens talk to `src/services`, never to mock data directly, so a real backend can be swapped in.
