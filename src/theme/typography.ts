import type { TextStyle } from 'react-native';

// Figma uses Inter throughout. Custom fonts don't synthesise weights on Android, so each weight
// maps to its own loaded family (see the useFonts call in src/app/_layout.tsx).
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fontFamily;

// Mirrors the Figma text styles.
export const typography = {
  display: { fontSize: 22, fontFamily: fontFamily.semibold, letterSpacing: -0.33 },
  headingLarge: { fontSize: 20, fontFamily: fontFamily.semibold },
  title: { fontSize: 17, fontFamily: fontFamily.semibold, letterSpacing: -0.255 },
  headingSmall: { fontSize: 16, fontFamily: fontFamily.semibold },
  bodyStrong: { fontSize: 15, fontFamily: fontFamily.semibold },
  body: { fontSize: 15, fontFamily: fontFamily.regular },
  bodySmall: { fontSize: 14, fontFamily: fontFamily.regular },
  label: { fontSize: 13, fontFamily: fontFamily.semibold },
  caption: { fontSize: 12, fontFamily: fontFamily.regular },
  captionStrong: { fontSize: 12, fontFamily: fontFamily.medium },
  tiny: { fontSize: 11, fontFamily: fontFamily.medium },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
