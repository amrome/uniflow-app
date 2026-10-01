import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { gradients, shadows, useTheme } from '@/theme';

type Props = {
  name: IconName;
  /** brand = orange gradient, ink = black gradient, soft = brand-tinted flat fill. */
  tone?: 'brand' | 'ink' | 'soft' | 'surface';
  size?: number;
  iconSize?: number;
};

/** Figma IconBubble: rounded gradient tile with a white glyph and an inner highlight. */
export function IconBubble({ name, tone = 'brand', size = 44, iconSize = 24 }: Props) {
  const { colors } = useTheme();
  const r = Math.round(size * 0.32);
  if (tone === 'soft' || tone === 'surface') {
    return (
      <View
        style={[
          styles.center,
          {
            width: size,
            height: size,
            borderRadius: r,
            backgroundColor: tone === 'soft' ? colors.brandPrimarySoft : colors.backgroundSurface,
          },
        ]}
      >
        <Icon
          name={name}
          size={iconSize}
          color={tone === 'soft' ? colors.brandPrimary : colors.textPrimary}
        />
      </View>
    );
  }
  const brand = tone === 'brand';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        boxShadow: brand ? shadows.brandBubble : shadows.inkBubble,
      }}
    >
      <LinearGradient
        colors={brand ? gradients.brand : gradients.ink}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.714]}
        style={[
          styles.center,
          StyleSheet.absoluteFill,
          {
            borderRadius: r,
            boxShadow: `inset 0px 1px 1px 0px rgba(255,255,255,${brand ? 0.35 : 0.18})`,
          },
        ]}
      >
        <Icon name={name} size={iconSize} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
