import type { TextStyle } from 'react-native';

// Mirrors the Figma text styles (Inter).
export const typography = {
  display: { fontSize: 28, fontWeight: '700' },
  headingLarge: { fontSize: 20, fontWeight: '600' },
  headingSmall: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodySmall: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
