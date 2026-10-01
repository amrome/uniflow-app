export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 14, xl: 16, card: 20, pill: 999 } as const;
// Figma screens are 440 wide with a 20px gutter (32px on auth screens), 48px inputs, 56px top bar.
export const layout = {
  gutter: 20,
  authGutter: 32,
  inputHeight: 48,
  topBarHeight: 56,
  tabBarHeight: 58,
} as const;

// Figma effect styles, as React Native boxShadow strings.
export const shadows = {
  card: '0px 8px 24px -4px rgba(61,36,15,0.08), 0px 1px 2px 0px rgba(61,36,15,0.05)',
  brandButton: '0px 6px 8px 0px rgba(246,137,56,0.32)',
  brandBubble: '0px 6px 14px -2px rgba(246,137,56,0.36)',
  inkBubble: '0px 6px 14px -2px rgba(0,0,0,0.28)',
  banner: '0px 6px 14px -4px rgba(242,102,38,0.3)',
  navBar: '0px -4px 8px 0px rgba(41,26,10,0.07)',
} as const;

// Figma gradient fills (135° = top-left → bottom-right).
export const gradients = {
  brand: ['#FFA45C', '#EF6C1A'],
  ink: ['#34343A', '#0B0B0C'],
  banner: ['#FA7829', '#ED4D33'],
} as const;
