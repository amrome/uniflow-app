import { Image } from 'expo-image';
import { StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText, Button, Card, Chip } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { formatTime } from '@/services/clock';
import type { Restaurant } from '@/services/food';
import { canCancel, nextStatus, type KitchenOrder, type KitchenStats } from '@/services/kitchen';
import { useTheme } from '@/theme';

/** Ink header of the Restaurant portal: logo, name, location and the Open / Closed switch. */
export function RestaurantHeader({
  restaurant,
  onToggleOpen,
}: {
  restaurant: Restaurant;
  onToggleOpen: (open: boolean) => void;
}) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const open = !restaurant.closed;
  return (
    <View style={[styles.header, { backgroundColor: colors.inkPrimary }]}>
      {restaurant.logo ? (
        <Image source={restaurant.logo} style={styles.logo} contentFit="cover" />
      ) : (
        <View style={[styles.logo, { backgroundColor: colors.brandPrimary }]} />
      )}
      <View style={styles.flex}>
        <AppText variant="headingLarge" style={styles.white} numberOfLines={1}>
          {restaurant.name[language]}
        </AppText>
        <AppText variant="caption" style={{ color: colors.inkOnInkMuted }} numberOfLines={1}>
          {fmt(t.restaurantPortal.role, { location: restaurant.location[language] })}
        </AppText>
      </View>
      <View style={styles.openBox}>
        <View style={styles.row}>
          <View
            style={[
              styles.dot,
              { backgroundColor: open ? colors.statusSuccess : colors.statusError },
            ]}
          />
          <AppText variant="bodyStrong" style={styles.white}>
            {open ? t.restaurantPortal.open : t.restaurantPortal.closed}
          </AppText>
        </View>
        <Switch
          value={open}
          onValueChange={onToggleOpen}
          trackColor={{ true: colors.statusSuccess, false: colors.statusError }}
          thumbColor="#FFFFFF"
          accessibilityLabel={t.restaurantPortal.status}
        />
      </View>
    </View>
  );
}

/** Four numbers across the top: orders, revenue, in the kitchen, waiting for pickup. */
export function StatsRow({ stats }: { stats: KitchenStats }) {
  const { t } = useI18n();
  const tiles: [string, string][] = [
    [t.restaurantPortal.ordersToday, String(stats.orders)],
    [t.restaurantPortal.revenue, fmt(t.restaurantPortal.sar, { n: stats.revenue })],
    [t.restaurantPortal.inKitchen, String(stats.active)],
    [t.restaurantPortal.readyCount, String(stats.ready)],
  ];
  return (
    <View style={styles.stats}>
      {tiles.map(([label, value]) => (
        <Card key={label} style={styles.stat}>
          <AppText variant="headingLarge" weight="bold" numberOfLines={1}>
            {value}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {label}
          </AppText>
        </Card>
      ))}
    </View>
  );
}

/** One order on the board. New orders are outlined in brand orange. */
export function OrderCard({
  order,
  onAdvance,
  onReject,
}: {
  order: KitchenOrder;
  onAdvance: () => void;
  onReject: () => void;
}) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const isNew = order.status === 'pending';
  const next = nextStatus[order.status];
  const action =
    order.status === 'pending'
      ? t.restaurantPortal.accept
      : order.status === 'preparing'
        ? t.restaurantPortal.markReady
        : t.restaurantPortal.pickedUp;
  const count = order.items.reduce((n, i) => n + i.qty, 0);
  return (
    <Card
      style={[
        styles.order,
        isNew && { borderColor: colors.brandPrimary, borderWidth: 2 },
        order.status === 'ready' && { borderColor: colors.statusSuccess, borderWidth: 2 },
      ]}
    >
      <View style={styles.between}>
        <AppText variant="headingLarge" weight="bold">
          {order.number}
        </AppText>
        <View style={[styles.pickup, { backgroundColor: colors.brandPrimarySoft }]}>
          <Icon name="clock" size={13} color={colors.brandPrimary} />
          <AppText variant="label" tone="brand">
            {fmt(t.restaurantPortal.pickupAt, { time: formatTime(order.pickupAt, language) })}
          </AppText>
        </View>
      </View>
      <View style={styles.between}>
        <AppText variant="bodySmall" weight="semibold" numberOfLines={1} style={styles.flex}>
          {order.customer}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {fmt(t.restaurantPortal.placedAt, { time: formatTime(order.placedAt, language) })}
        </AppText>
      </View>
      <View style={[styles.items, { borderColor: colors.borderDefault }]}>
        {order.items.map((i, idx) => (
          <View key={idx} style={styles.row}>
            <AppText variant="bodyStrong" weight="bold" tone="brand" style={styles.qty}>
              {i.qty}×
            </AppText>
            <AppText size={18}>{i.emoji}</AppText>
            <AppText variant="body" style={styles.flex}>
              {i.name[language]}
            </AppText>
          </View>
        ))}
      </View>
      {order.notes ? (
        <View style={[styles.note, { backgroundColor: colors.brandPrimarySoft }]}>
          <AppText variant="captionStrong" tone="brand">
            {t.restaurantPortal.note}
          </AppText>
          <AppText variant="bodySmall" style={styles.flex}>
            {order.notes}
          </AppText>
        </View>
      ) : null}
      <View style={styles.between}>
        <AppText variant="caption" tone="secondary">
          {count === 1 ? t.restaurantPortal.oneItem : fmt(t.restaurantPortal.items, { n: count })}{' '}
          · {t.restaurantPortal.pay[order.payment]}
        </AppText>
        <AppText variant="bodyStrong" weight="bold">
          {fmt(t.restaurantPortal.sar, { n: order.total })}
        </AppText>
      </View>
      {next && (
        <View style={styles.actions}>
          {canCancel(order.status) && (
            <Button
              label={t.restaurantPortal.reject}
              variant="danger"
              onPress={onReject}
              style={styles.reject}
            />
          )}
          <Button
            label={action}
            variant={order.status === 'ready' ? 'ink' : 'primary'}
            onPress={onAdvance}
            style={styles.flex}
          />
        </View>
      )}
    </Card>
  );
}

/** A finished order (picked up or cancelled) in the "Done today" list. */
export function DoneRow({ order }: { order: KitchenOrder }) {
  const { t, language } = useI18n();
  return (
    <Card style={styles.done}>
      <AppText variant="bodyStrong" weight="bold" style={styles.doneNo}>
        {order.number}
      </AppText>
      <AppText variant="bodySmall" numberOfLines={1} style={styles.flex}>
        {order.customer} · {formatTime(order.placedAt, language)}
      </AppText>
      <AppText variant="bodySmall" weight="semibold">
        {fmt(t.restaurantPortal.sar, { n: order.total })}
      </AppText>
      <Chip
        label={
          order.status === 'cancelled'
            ? t.restaurantPortal.cancelled
            : t.restaurantPortal.completed
        }
        tone={order.status === 'cancelled' ? 'neutral' : 'successSoft'}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  white: { color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  logo: { width: 56, height: 56, borderRadius: 14 },
  openBox: { alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 140, gap: 2, borderRadius: 16 },
  order: { gap: 10, borderRadius: 18 },
  pickup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  items: { gap: 6, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1 },
  qty: { minWidth: 30 },
  note: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  reject: { minWidth: 100 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  doneNo: { minWidth: 86 },
});
