import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText, Button, Card, ConfirmDialog, FilterChip, Screen } from '@/components/ui';
import { AnimatedItem } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { DoneRow, OrderCard, RestaurantHeader, StatsRow } from '@/features/restaurant/components';
import { StaffRootBar } from '@/features/staff/components';
import { fmt, useI18n } from '@/i18n';
import type { OrderStatus } from '@/services/food';
import { useRestaurant } from '@/services/food';
import {
  kitchenStats,
  nextStatus,
  setOrderStatus,
  updateRestaurant,
  useKitchenOrders,
  type KitchenOrder,
} from '@/services/kitchen';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

type Column = 'pending' | 'preparing' | 'ready';
const COLUMNS: Column[] = ['pending', 'preparing', 'ready'];

// Restaurant portal (no Figma frame yet): the live orders board on the restaurant's iPad.
// On a tablet the three columns sit side by side; on a phone a chip row switches between them.
export default function RestaurantPortal() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const slug = session?.restaurantId;
  const restaurant = useRestaurant(slug);
  const orders = useKitchenOrders().filter((o) => o.restaurantId === slug);
  const [column, setColumn] = useState<Column>('pending');
  const [rejecting, setRejecting] = useState<KitchenOrder | null>(null);
  const wide = width >= 760;

  const header = <StaffRootBar title={t.restaurantPortal.title} />;
  if (!slug) {
    return (
      <Screen header={header}>
        <AppText variant="body" tone="secondary" align="center">
          {t.restaurantPortal.noRestaurant}
        </AppText>
      </Screen>
    );
  }
  if (!restaurant) {
    return (
      <Screen header={header} gap={12}>
        <Skeleton height={84} radius={18} />
        <Skeleton height={70} radius={16} />
        <Skeleton height={220} radius={18} />
      </Screen>
    );
  }

  const inColumn = (s: OrderStatus) =>
    orders.filter((o) => o.status === s).sort((a, b) => a.pickupAt - b.pickupAt);
  const done = orders
    .filter((o) => o.status === 'completed' || o.status === 'cancelled')
    .sort((a, b) => b.placedAt - a.placedAt);
  const advance = (o: KitchenOrder) => {
    const next = nextStatus[o.status];
    if (next) setOrderStatus(o.id, next);
  };

  const renderColumn = (c: Column) => {
    const list = inColumn(c);
    return (
      <View key={c} style={wide ? styles.column : undefined}>
        {wide && (
          <View style={styles.columnHead}>
            <View style={[styles.dot, { backgroundColor: dotColor(c) }]} />
            <AppText variant="title" style={styles.flex}>
              {t.restaurantPortal.columns[c]}
            </AppText>
            <View style={[styles.count, { backgroundColor: colors.backgroundSurface }]}>
              <AppText variant="label">{list.length}</AppText>
            </View>
          </View>
        )}
        <View style={styles.list}>
          {list.map((o) => (
            <AnimatedItem key={o.id}>
              <OrderCard
                order={o}
                onAdvance={() => advance(o)}
                onReject={() => setRejecting(o)}
              />
            </AnimatedItem>
          ))}
          {!list.length && (
            <View style={[styles.empty, { borderColor: colors.borderDefault }]}>
              <AppText variant="bodySmall" tone="secondary" align="center">
                {t.restaurantPortal.empty}
              </AppText>
            </View>
          )}
        </View>
      </View>
    );
  };

  function dotColor(c: Column) {
    if (c === 'pending') return colors.brandPrimary;
    if (c === 'preparing') return colors.textSecondary;
    return colors.statusSuccess;
  }

  return (
    <Screen header={header} gap={14}>
      <RestaurantHeader
        restaurant={restaurant}
        onToggleOpen={(open) => updateRestaurant(restaurant.id, { closed: !open })}
      />
      <StatsRow stats={kitchenStats(orders)} />
      <Button
        label={t.restaurantPortal.menu}
        variant="secondary"
        icon="edit"
        onPress={() => router.push('/staff/restaurant-menu')}
      />

      {wide ? (
        <View style={styles.board}>{COLUMNS.map(renderColumn)}</View>
      ) : (
        <>
          <View style={styles.chips}>
            {COLUMNS.map((c) => (
              <FilterChip
                key={c}
                label={`${t.restaurantPortal.columns[c]} · ${inColumn(c).length}`}
                selected={column === c}
                onPress={() => setColumn(c)}
              />
            ))}
          </View>
          {renderColumn(column)}
        </>
      )}

      <AppText variant="bodyStrong" style={styles.sectionTop}>
        {t.restaurantPortal.history}
      </AppText>
      {done.length ? (
        done.map((o) => <DoneRow key={o.id} order={o} />)
      ) : (
        <Card tone="surface">
          <AppText variant="bodySmall" tone="secondary">
            {t.restaurantPortal.historyEmpty}
          </AppText>
        </Card>
      )}

      <ConfirmDialog
        visible={!!rejecting}
        title={fmt(t.restaurantPortal.rejectTitle, { number: rejecting?.number ?? '' })}
        body={t.restaurantPortal.rejectBody}
        keepLabel={t.restaurantPortal.keep}
        confirmLabel={t.restaurantPortal.reject}
        onKeep={() => setRejecting(null)}
        onConfirm={() => {
          if (rejecting) setOrderStatus(rejecting.id, 'cancelled');
          setRejecting(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  board: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  column: { flex: 1, gap: 10 },
  columnHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  count: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  list: { gap: 10 },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sectionTop: { marginTop: 6 },
});
