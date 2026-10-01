import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons';
import { AppText } from '@/components/ui';
import { fmt, useI18n } from '@/i18n';
import { useCart } from '@/services/cart';
import { getRestaurant } from '@/services/food';
import { typography, useTheme } from '@/theme';

/** Figma Search field: surface fill, 12px radius, search glyph + 14px placeholder. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <View style={[styles.search, { backgroundColor: colors.backgroundSurface }]}>
      <Icon name="search" size={18} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        style={[
          typography.bodySmall,
          styles.searchInput,
          { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
        ]}
      />
    </View>
  );
}

/** Figma Stepper: orange pill with − qty +. */
export function Stepper({
  qty,
  onInc,
  onDec,
}: {
  qty: number;
  onInc: () => void;
  onDec: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: colors.brandPrimary }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="−" hitSlop={8} onPress={onDec}>
        <AppText variant="bodyStrong" weight="bold" tone="onBrand">
          −
        </AppText>
      </Pressable>
      <AppText variant="bodyStrong" weight="bold" tone="onBrand">
        {qty}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="+" hitSlop={8} onPress={onInc}>
        <AppText variant="bodyStrong" weight="bold" tone="onBrand">
          +
        </AppText>
      </Pressable>
    </View>
  );
}

/** Figma CartBar: "{n} items · Restaurant", total, and a View Cart button. Hidden when empty. */
export function CartBar() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { count, subtotal, vendorId } = useCart();
  const restaurant = getRestaurant(vendorId ?? undefined);
  if (!count || !restaurant) return null;
  return (
    <View
      style={[
        styles.cartBar,
        { backgroundColor: colors.backgroundPrimary, borderTopColor: colors.borderDefault },
      ]}
    >
      <View>
        <AppText variant="caption" tone="secondary">
          {fmt(t.food.itemsCount, { n: count, restaurant: restaurant.name[language] })}
        </AppText>
        <AppText variant="headingSmall" weight="bold">
          {fmt(t.food.price, { n: subtotal })}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/food/cart')}
        style={[styles.viewCart, { backgroundColor: colors.brandPrimary }]}
      >
        <AppText variant="headingSmall" tone="onBrand">
          {t.food.viewCart}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
  },
  searchInput: { flex: 1, padding: 0 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cartBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  viewCart: {
    width: 160,
    paddingVertical: 9,
    borderRadius: 14,
    alignItems: 'center',
  },
});
