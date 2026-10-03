import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Tone = 'success' | 'successSoft' | 'neutral' | 'error' | 'brand' | 'brandSoft' | 'ink';

/** Figma Chip/Success · Chip/Neutral · Chip/Error — small status pill. */
export function Chip({
  label,
  tone = 'neutral',
  dot,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
}) {
  const { colors } = useTheme();
  const look = {
    success: { bg: colors.statusSuccess, fg: colors.textOnBrand, border: 'transparent' },
    successSoft: { bg: colors.statusSuccessSoft, fg: colors.statusSuccess, border: 'transparent' },
    neutral: {
      bg: colors.backgroundSurface,
      fg: colors.textSecondary,
      border: colors.borderDefault,
    },
    error: { bg: colors.statusError, fg: colors.textOnBrand, border: 'transparent' },
    brand: { bg: colors.brandPrimary, fg: colors.textOnBrand, border: 'transparent' },
    brandSoft: { bg: colors.brandPrimarySoft, fg: colors.brandPrimary, border: 'transparent' },
    ink: { bg: colors.inkPrimary, fg: '#FFFFFF', border: 'transparent' },
  }[tone];
  return (
    <View style={[styles.chip, { backgroundColor: look.bg, borderColor: look.border }]}>
      {dot && <View style={[styles.dot, { backgroundColor: look.fg }]} />}
      <AppText variant="captionStrong" style={{ color: look.fg }}>
        {label}
      </AppText>
    </View>
  );
}

type FilterProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
};

/** Selectable filter pill (major filters, event filters, time slots). */
export function FilterChip({ label, selected, onPress, icon }: FilterProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      scaleTo={0.95}
      feedback="select"
      onPress={onPress}
      style={[
        styles.filter,
        selected
          ? { backgroundColor: colors.inkPrimary, borderColor: colors.inkPrimary }
          : { backgroundColor: colors.backgroundPrimary, borderColor: colors.borderDefault },
      ]}
    >
      {icon && <Icon name={icon} size={14} color={selected ? '#FFFFFF' : colors.textSecondary} />}
      <AppText
        variant="label"
        weight={selected ? 'semibold' : 'medium'}
        style={{ color: selected ? '#FFFFFF' : colors.textPrimary }}
      >
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
});
