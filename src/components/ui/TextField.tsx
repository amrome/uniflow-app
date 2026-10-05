import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n';
import { layout, radius, spacing, typography, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = TextInputProps & { label?: string; editable?: boolean; required?: boolean };

/**
 * Figma Input/Field: 12px medium label, 48px field, 12px radius, 1px border.
 * A `secureTextEntry` field gets a show/hide (eye) button.
 */
export function TextField({ label, editable = true, required, style, ...rest }: Props) {
  const { colors } = useTheme();
  const { isRTL, t } = useI18n();
  const isPassword = !!rest.secureTextEntry;
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.wrap}>
      {label && (
        <AppText variant="captionStrong" tone="secondary">
          {label}
          {required && <AppText style={{ color: colors.statusError }}> *</AppText>}
        </AppText>
      )}
      <View>
        <TextInput
          accessibilityLabel={label}
          editable={editable}
          placeholderTextColor={colors.textSecondary}
          {...rest}
          secureTextEntry={isPassword && !revealed}
          style={[
            styles.input,
            typography.body,
            {
              color: editable ? colors.textPrimary : colors.textSecondary,
              backgroundColor: editable ? colors.backgroundPrimary : colors.backgroundSurface,
              borderColor: colors.borderDefault,
              textAlign: isRTL ? 'right' : 'left',
            },
            isPassword && styles.withEye,
            style,
          ]}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? t.common.hidePassword : t.common.showPassword}
            hitSlop={8}
            onPress={() => setRevealed((v) => !v)}
            style={styles.eye}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
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
  withEye: { paddingEnd: 48 },
  eye: { position: 'absolute', end: spacing.lg, top: 0, bottom: 0, justifyContent: 'center' },
});
