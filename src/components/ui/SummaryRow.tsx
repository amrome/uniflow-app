import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';

/** Label/value row used by cart, checkout and confirmation summaries. */
export function SummaryRow({
  label,
  value,
  strong,
  accent,
  muted = !strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={styles.row}>
      <AppText
        variant={strong ? 'bodySmall' : 'label'}
        weight={strong ? 'semibold' : 'regular'}
        tone={muted ? 'secondary' : 'primary'}
        style={styles.label}
      >
        {label}
      </AppText>
      <AppText
        variant={strong ? 'bodySmall' : 'label'}
        weight={strong ? 'semibold' : muted ? 'regular' : 'medium'}
        tone={accent ? 'brand' : muted ? 'secondary' : 'primary'}
      >
        {value}
      </AppText>
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1 },
  divider: { height: 1, marginVertical: 4 },
});
