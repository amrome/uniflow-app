import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useI18n } from '@/i18n';
import { layout, radius, spacing, typography, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = TextInputProps & { label: string; editable?: boolean };

export function TextField({ label, editable = true, style, ...rest }: Props) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <View style={styles.wrap}>
      <AppText variant="bodySmall" tone="secondary" style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {label}
      </AppText>
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
            backgroundColor: colors.backgroundSurface,
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
  wrap: { gap: spacing.sm },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
});
