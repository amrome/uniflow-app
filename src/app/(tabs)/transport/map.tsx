import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { fmt, useI18n } from '@/i18n';
import { fontFamily, typography, useTheme } from '@/theme';

// Figma 11.1a · Campus Map (3D): extruded building blocks on a 360×760 campus plot.
type Building = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  top: string;
  side: string;
  en: string;
  ar: string;
};

const buildings: Building[] = [
  {
    id: 'park1',
    x: 106,
    y: 24,
    w: 66,
    h: 42,
    top: '#9999A8',
    side: '#6B6B76',
    en: 'Parking',
    ar: 'مواقف',
  },
  {
    id: 'mosque',
    x: 242,
    y: 20,
    w: 92,
    h: 46,
    top: '#7AADA8',
    side: '#567976',
    en: '🕌 Mosque',
    ar: '🕌 مسجد',
  },
  {
    id: 'yu',
    x: 188,
    y: 80,
    w: 150,
    h: 66,
    top: '#E0B86B',
    side: '#9D814B',
    en: 'Al-Yamamah University',
    ar: 'جامعة اليمامة',
  },
  {
    id: 'sport',
    x: 28,
    y: 152,
    w: 112,
    h: 54,
    top: '#85BD94',
    side: '#5D8468',
    en: 'YU Sport Club',
    ar: 'نادي الجامعة',
  },
  {
    id: 'juve',
    x: 170,
    y: 204,
    w: 120,
    h: 44,
    top: '#8C9ED9',
    side: '#626F98',
    en: 'Juventus Academy',
    ar: 'أكاديمية يوفنتوس',
  },
  {
    id: 'archi',
    x: 20,
    y: 282,
    w: 84,
    h: 40,
    top: '#A38FCC',
    side: '#72648F',
    en: 'Archi',
    ar: 'أرتقى',
  },
  {
    id: 'armoor',
    x: 294,
    y: 272,
    w: 58,
    h: 40,
    top: '#9999A8',
    side: '#6B6B76',
    en: 'Armoor',
    ar: 'أرمور',
  },
  {
    id: 'eng',
    x: 16,
    y: 332,
    w: 96,
    h: 66,
    top: '#8094D1',
    side: '#596892',
    en: 'Eng. & Architecture',
    ar: 'الهندسة والعمارة',
  },
  {
    id: 'padel',
    x: 256,
    y: 332,
    w: 94,
    h: 48,
    top: '#73B88C',
    side: '#508162',
    en: 'YUPadel',
    ar: 'يوبادل',
  },
  {
    id: 'tuwaiq',
    x: 28,
    y: 424,
    w: 116,
    h: 52,
    top: '#D6B27A',
    side: '#967D56',
    en: 'Tuwaiq Building',
    ar: 'مبنى طويق',
  },
  {
    id: 'park2',
    x: 26,
    y: 510,
    w: 60,
    h: 40,
    top: '#9999A8',
    side: '#6B6B76',
    en: 'Parking',
    ar: 'مواقف',
  },
  {
    id: 'tennis',
    x: 96,
    y: 556,
    w: 92,
    h: 44,
    top: '#73B88C',
    side: '#508162',
    en: 'Tennis Court',
    ar: 'ملعب تنس',
  },
  {
    id: 'res',
    x: 106,
    y: 628,
    w: 150,
    h: 56,
    top: '#B29980',
    side: '#7D6B59',
    en: 'Yamami Residence',
    ar: 'سكن اليمامي',
  },
];

const PLOT_W = 360;
const PLOT_H = 760;

export default function CampusMap3D() {
  const { t, language, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const match = (b: Building) => !!q && (b.en.toLowerCase().includes(q) || b.ar.includes(q));

  const vehicles = [
    {
      emoji: '🚌',
      bg: '#F58A38',
      name: t.transport.sabShuttle,
      near: t.transport.sabShuttleNear,
      eta: 4,
    },
    {
      emoji: '🛺',
      bg: '#2E7D33',
      name: t.transport.golfCart2,
      near: t.transport.golfCart2Near,
      eta: 2,
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 260 }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          <View style={{ width: PLOT_W * zoom, height: PLOT_H * zoom }}>
            <View
              style={[
                styles.plot,
                {
                  width: PLOT_W,
                  height: PLOT_H,
                  transform: [{ scale: zoom }],
                  transformOrigin: 'top left',
                },
              ]}
            >
              <View style={[styles.road, { left: 6, top: 10, width: 334, height: 20 }]} />
              <View style={[styles.road, { left: 336, top: 16, width: 22, height: 744 }]} />
              <View style={[styles.road, { left: 1, top: 42, width: 20, height: 718 }]} />
              {[288, 344, 568, 624].map((y) => (
                <View key={y} style={[styles.dash, { left: 146, top: y }]} />
              ))}
              <View style={[styles.field, { left: 106, top: 254 }]}>
                <View style={styles.fieldInner}>
                  <Text style={styles.fieldText}>
                    {language === 'ar' ? '⚽ ملعب كرة القدم' : '⚽ Soccer Field'}
                  </Text>
                </View>
              </View>
              <View style={[styles.cartPin, { left: 134, top: 374 }]}>
                <Text style={{ fontSize: 12 }}>🛺</Text>
              </View>
              {buildings.map((b) => (
                <View
                  key={b.id}
                  style={{
                    position: 'absolute',
                    left: b.x,
                    top: b.y,
                    width: b.w + 5,
                    height: b.h + 7,
                  }}
                >
                  <View
                    style={[
                      styles.block,
                      { left: 5, top: 7, width: b.w, height: b.h, backgroundColor: b.side },
                    ]}
                  />
                  <View
                    style={[
                      styles.block,
                      styles.blockTop,
                      {
                        width: b.w,
                        height: b.h,
                        backgroundColor: b.top,
                        borderColor: match(b) ? colors.brandPrimary : '#FFFFFF',
                        borderWidth: match(b) ? 3 : 1,
                      },
                    ]}
                  >
                    <Text numberOfLines={2} style={styles.blockText}>
                      {b[language]}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      <View style={[styles.topRow, { top: insets.top + 16 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          onPress={() => router.back()}
          style={styles.squareBtn}
        >
          <AppText size={22} weight="semibold" style={{ color: '#000' }}>
            {isRTL ? '›' : '‹'}
          </AppText>
        </Pressable>
        <View style={styles.search}>
          <Text>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.transport.mapSearch}
            placeholderTextColor="#6B6560"
            style={[typography.label, styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>
        <View style={[styles.squareBtn, { backgroundColor: colors.brandPrimary }]}>
          <AppText variant="label" weight="bold" tone="onBrand">
            3D
          </AppText>
        </View>
      </View>

      <View style={[styles.controls, { top: insets.top + 74 }]}>
        {(
          [
            ['＋', () => setZoom((z) => Math.min(1.8, z + 0.2))],
            ['－', () => setZoom((z) => Math.max(0.8, z - 0.2))],
            ['📍', () => setZoom(1)],
            ['⌗', () => setQuery('')],
          ] as const
        ).map(([label, onPress]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={onPress}
            style={styles.control}
          >
            <Text style={styles.controlText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.backgroundPrimary, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.borderDefault }]} />
        <View style={styles.sheetHead}>
          <AppText variant="bodyStrong" weight="bold" size={16}>
            {t.transport.liveVehicles}
          </AppText>
          <View style={styles.trackedDot} />
          <AppText variant="caption" tone="secondary">
            {fmt(t.transport.tracked, { n: language === 'ar' ? '٢' : 2 })}
          </AppText>
        </View>
        {vehicles.map((v) => (
          <View
            key={v.name}
            style={[styles.vehicle, { backgroundColor: colors.backgroundSurface }]}
          >
            <View style={[styles.vehicleIcon, { backgroundColor: v.bg }]}>
              <Text style={{ fontSize: 15 }}>{v.emoji}</Text>
            </View>
            <View style={styles.flex}>
              <AppText variant="bodySmall" weight="semibold">
                {v.name}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {v.near}
              </AppText>
            </View>
            <View>
              <AppText variant="label" weight="bold" tone="brand">
                {fmt(t.transport.minutesAway, { n: v.eta })}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {t.transport.center}
              </AppText>
            </View>
          </View>
        ))}
        <Button
          label={t.transport.notifyNear}
          onPress={() =>
            toast.show({
              emoji: '🚌',
              title: t.transport.notifyToastTitle,
              body: t.transport.notifyToastBody,
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#DDCFA8' },
  flex: { flex: 1 },
  hScroll: { paddingHorizontal: 40, flexGrow: 1, justifyContent: 'center', direction: 'ltr' },
  plot: { backgroundColor: '#DBE3D1', borderRadius: 24, direction: 'ltr' },
  road: { position: 'absolute', backgroundColor: '#B2B2B8', borderRadius: 4 },
  dash: { position: 'absolute', width: 6, height: 26, borderRadius: 2, backgroundColor: '#F2E599' },
  field: {
    position: 'absolute',
    width: 118,
    height: 158,
    borderRadius: 59,
    backgroundColor: '#383D38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInner: {
    width: 96,
    height: 132,
    borderRadius: 48,
    backgroundColor: '#4D8C52',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldText: { color: '#FFFFFF', fontSize: 9, fontFamily: fontFamily.bold },
  cartPin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E7D33',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { position: 'absolute', borderRadius: 6 },
  blockTop: {
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  blockText: { color: '#FFFFFF', fontSize: 9, fontFamily: fontFamily.bold, textAlign: 'center' },
  topRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  squareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)',
  },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)',
  },
  searchInput: { flex: 1, color: '#000000', padding: 0, fontFamily: fontFamily.regular },
  controls: { position: 'absolute', right: 16, gap: 4 },
  control: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)',
  },
  controlText: { fontSize: 20, color: '#000000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
    boxShadow: '0px -4px 16px 0px rgba(0,0,0,0.1)',
  },
  grabber: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, marginBottom: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  trackedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D33', marginStart: 12 },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
  },
  vehicleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
