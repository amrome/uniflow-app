import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/icons';

import { AppText } from './AppText';
import { Card } from './Card';
import { IconBubble } from './IconBubble';
import { Reveal } from './Reveal';

type Props = {
  icon: IconName;
  tone: 'brand' | 'ink';
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Position in the grid: tiles appear one after another in this order. */
  index?: number;
};

/** Figma Tile/*: card with an icon bubble, 15px title and 12px description. */
export function ServiceTile({ icon, tone, title, subtitle, onPress, index = 0 }: Props) {
  return (
    <Reveal index={index} style={styles.reveal}>
      <Card onPress={onPress} style={styles.tile} accessibilityLabel={title}>
        <IconBubble name={icon} tone={tone} />
        <View style={styles.text}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        </View>
      </Card>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  reveal: { flex: 1 },
  tile: { flex: 1, gap: 10 },
  text: { gap: 2 },
});
