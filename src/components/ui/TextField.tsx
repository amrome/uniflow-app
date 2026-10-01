import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useI18n } from '@/i18n';
import { layout, radius, spacing, typography, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = TextInputProps & { label?: string; editable?: boolean };

/** Figma Input/Field: 12px medium label, 48px field, 12px radius, 1px border. */
export function TextField({ label, editable = true, style, ...rest }: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <View style={styles.wrap}>
      {label && (
        <AppText variant="captionStrong" tone="secondary">
          {label}
        </AppText>
      )}
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        placeholderTextColor={colors.textSecondary}
        {...rest}
        style={[
          styles.input,
          typography.body,
          {
            color: editable ? colors.textPrimary : colors.textSecondary,
            backgroundColor: editable ? colors.backgroundPrimary : colors.backgroundSurface,
            borderColor: colors.borderDefault,
            textAlign: isRTL ? 'right' : 'left',
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, alignSelf: 'stretch' },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
});
