import { Pressable, StyleSheet } from 'react-native';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

/** Figma LangToggle: pill showing the language you'd switch *to*. */
export function LangToggle() {
  const { colors } = useTheme();
  const { language, toggleLanguage } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={language === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
      onPress={toggleLanguage}
      hitSlop={8}
      style={[
        styles.pill,
        { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault },
      ]}
    >
      <AppText variant="captionStrong" weight="semibold" align="center">
        {language === 'en' ? '🌐 ع' : '🌐 EN'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 30,
    minWidth: 41,
    paddingHorizontal: 8,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
