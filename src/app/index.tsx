import { Link } from 'expo-router';

import { AppText, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';

// Temporary home while screens are ported from Figma (Phase 3).
export default function Index() {
  const { t, toggleLanguage, language } = useI18n();
  return (
    <Screen>
      <AppText variant="display">Uniflow</AppText>
      <Link href="/profile/edit">
        <AppText tone="brand">{t.profile.editTitle}</AppText>
      </Link>
      <AppText tone="brand" onPress={toggleLanguage} accessibilityRole="button">
        {language === 'en' ? 'ع' : 'EN'}
      </AppText>
    </Screen>
  );
}
