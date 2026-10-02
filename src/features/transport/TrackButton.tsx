import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

/**
 * Same look as the instructors' "Notify me" button: outlined orange when off, solid orange
 * ("Tracking") when on. Tap again to stop tracking.
 */
export function TrackButton({ on, onPress }: { on: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={6}
      onPress={onPress}
      style={[
        styles.button,
        {
          borderColor: colors.brandPrimary,
          backgroundColor: on ? colors.brandPrimary : colors.brandPrimarySoft,
        },
      ]}
    >
      <Icon name="bellPlus" size={14} color={on ? '#FFFFFF' : colors.brandPrimary} />
      <AppText variant="tiny" weight="semibold" tone={on ? 'onBrand' : 'brand'}>
        {on ? t.transport.trackingBtn : t.transport.trackBtn}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingStart: 10,
    paddingEnd: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
});
