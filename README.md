# Uniflow

One app. Every campus need. React Native (Expo) app for Al Yamamah University students:
instructor schedules, food pre-ordering, parking, events, transportation and profile.

## Stack

Expo SDK 57 · React Native · TypeScript (strict) · expo-router · Jest · ESLint + Prettier

## Getting started

```bash
npm install
npm start        # then open the Uniflow development app (see below)
```

### Development build (needed for the 3D map)

The 3D campus map is native code, so the app **no longer runs in Expo Go**. Build the Uniflow
development app once, install it on your phone, and use it exactly like Expo Go (JS changes still
reload instantly; rebuild only when a native package is added).

**Android** (works from any computer, builds in the cloud):

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # ~15 min, gives you an install link / QR
npm start                                              # open the installed Uniflow app and connect
```

**iPhone**: `eas build --profile development --platform ios` needs a paid Apple Developer account;
with a Mac and Xcode you can run `npx expo run:ios` instead.

### Campus map

`src/features/transport/campusMapData.ts` holds the campus and SAB Station coordinates and the
hand-drawn campus buildings (orange). Every other building comes from OpenStreetMap through
[OpenFreeMap](https://openfreemap.org) (free, no API key). To add a building: draw it at
[geojson.io](https://geojson.io) in satellite view, give it `name`, `name_ar` and `height`
(metres) properties, and paste the feature into `CAMPUS_BUILDINGS`.

## Scripts

| Command             | What it does        |
| ------------------- | ------------------- |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint`      | ESLint              |
| `npm run format`    | Prettier            |
| `npm test`          | Jest                |

## Structure

```
src/app         expo-router routes (one file per screen)
src/components  shared UI (src/components/ui)
src/features    feature-specific components and logic
src/theme       design tokens from Figma, light + dark
src/i18n        English + Arabic strings, RTL handling
src/services    data access (mocked now, backend later)
src/mocks       mock data
```

## Conventions

- Every screen ships in four variants: EN, AR (RTL), dark, dark AR. Colors come from
  `useTheme()`, strings from `useI18n()`; never hard-code either.
- Screens talk to `src/services`, never to mock data directly, so a real backend can be swapped in.
