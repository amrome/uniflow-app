import { darkColors, lightColors } from '@/theme';

describe('theme tokens', () => {
  it('uses the Uniflow brand orange in light mode', () => {
    expect(lightColors.brandPrimary).toBe('#F68938');
  });
  it('defines every light token in dark mode', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});
