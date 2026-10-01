import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/icons';

import { AppText } from './AppText';
import { Card } from './Card';
import { IconBubble } from './IconBubble';

type Props = {
  icon: IconName;
  tone: 'brand' | 'ink';
  title: string;
  subtitle: string;
  onPress: () => void;
};

/** Figma Tile/*: card with an icon bubble, 15px title and 12px description. */
export function ServiceTile({ icon, tone, title, subtitle, onPress }: Props) {
  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={title}>
      <IconBubble name={icon} tone={tone} />
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {subtitle}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: 10 },
  text: { gap: 2 },
});
