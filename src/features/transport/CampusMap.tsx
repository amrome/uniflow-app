import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { useI18n } from '@/i18n';
import { fontFamily } from '@/theme';

// Figma "LiveMap" — the illustrated YU campus map drawn on a 400×240 canvas. Every shape is
// positioned in that design space and scaled to the available width.
const W = 400;
const H = 240;

const labels = {
  en: {
    north: 'Mahmoud Al-Hamsi St',
    south: 'Amin Al-Shibi St',
    east: 'King Fahd Branch Rd',
    eng1: 'Engineering &',
    eng2: 'Architecture',
    tennis: 'Tennis',
    tuwaiq: 'Tuwaiq Building',
    stadium: 'Stadium',
    padel: 'YUPadel',
    hall1: 'Al-Khudair',
    hall2: 'Hall',
    main1: 'Main',
    main2: 'Building',
    mosque: 'Mosque',
    center1: 'Student',
    center2: 'Center',
    gate: 'Main Gate',
    sab: 'SAB Station ↓',
    cart: 'Golf cart',
    shuttle: 'Shuttle',
    you: 'You',
  },
  ar: {
    north: 'شارع محمود الحمصي',
    south: 'شارع أمين الشيبي',
    east: 'طريق الملك فهد الفرعي',
    eng1: 'كلية الهندسة',
    eng2: 'العمارة',
    tennis: 'تنس',
    tuwaiq: 'مبنى طويق',
    stadium: 'الملعب',
    padel: 'YUPadel',
    hall1: 'قاعة',
    hall2: 'الخضير',
    main1: 'المبنى',
    main2: 'الرئيسي',
    mosque: 'المسجد',
    center1: 'مركز',
    center2: 'الطلاب',
    gate: 'البوابة الرئيسية',
    sab: 'محطة ساب ↓',
    cart: 'عربة جولف',
    shuttle: 'الحافلة',
    you: 'أنت',
  },
};

type Box = { x: number; y: number; w: number; h: number; r?: number; bg: string; border?: string };

const blocks: Box[] = [
  { x: 0, y: 8, w: 400, h: 13, bg: '#FFFFFF' },
  { x: 0, y: 222, w: 400, h: 13, bg: '#FFFFFF' },
  { x: 0, y: 0, w: 10, h: 240, bg: '#FFFFFF' },
  { x: 372, y: 0, w: 28, h: 240, bg: '#DBD6CC' },
  { x: 385, y: 0, w: 2, h: 240, bg: 'rgba(255,255,255,0.9)' },
  { x: 16, y: 26, w: 350, h: 190, r: 14, bg: '#FCFAF5', border: '#E0D9CC' },
  { x: 16, y: 172, w: 350, h: 7, bg: '#EDE8E0' },
  { x: 136, y: 26, w: 7, h: 190, bg: '#EDE8E0' },
  { x: 240, y: 26, w: 6, h: 146, bg: '#EDE8E0' },
  { x: 24, y: 34, w: 72, h: 26, r: 6, bg: '#EDEDED' },
  { x: 270, y: 32, w: 40, h: 24, r: 6, bg: '#FFEDDE', border: '#F68938' },
  { x: 24, y: 68, w: 104, h: 96, r: 8, bg: '#E3DBCF' },
  { x: 58, y: 98, w: 34, h: 34, r: 17, bg: '#FFFFFF', border: '#F68938' },
  { x: 24, y: 184, w: 70, h: 26, r: 5, bg: '#E3DBCF' },
  { x: 100, y: 184, w: 34, h: 26, r: 4, bg: '#73B280' },
  { x: 148, y: 34, w: 86, h: 20, r: 5, bg: '#E3DBCF' },
  { x: 148, y: 62, w: 86, h: 104, r: 43, bg: '#D6D4E5' },
  { x: 160, y: 78, w: 62, h: 72, r: 26, bg: '#80BD87' },
  { x: 250, y: 36, w: 14, h: 30, r: 3, bg: '#66A878' },
  { x: 250, y: 74, w: 14, h: 30, r: 3, bg: '#DB735C' },
  { x: 160, y: 184, w: 70, h: 26, r: 5, bg: '#9EBDE5' },
  { x: 272, y: 66, w: 40, h: 40, r: 20, bg: '#E3DBCF' },
  { x: 318, y: 64, w: 42, h: 96, r: 7, bg: '#E3DBCF' },
  { x: 322, y: 32, w: 34, h: 22, r: 5, bg: '#E3DBCF' },
  { x: 250, y: 120, w: 62, h: 42, r: 6, bg: '#E3DBCF' },
  { x: 250, y: 184, w: 108, h: 26, r: 5, bg: '#E3DBCF' },
  { x: 362, y: 132, w: 8, h: 26, r: 3, bg: '#F68938' },
];

type Label = {
  x: number;
  y: number;
  key: keyof typeof labels.en;
  size: number;
  color: string;
  bold?: boolean;
};

const ink = '#000000';
const muted = '#6B6560';
const textLabels: Label[] = [
  { x: 150, y: 9, key: 'north', size: 7, color: muted },
  { x: 150, y: 223, key: 'south', size: 7, color: muted },
  { x: 30, y: 72, key: 'eng1', size: 7.5, color: ink },
  { x: 30, y: 82, key: 'eng2', size: 7.5, color: ink },
  { x: 104, y: 192, key: 'tennis', size: 7, color: '#FFFFFF', bold: true },
  { x: 156, y: 39, key: 'tuwaiq', size: 7.5, color: ink },
  { x: 172, y: 108, key: 'stadium', size: 8, color: '#FFFFFF', bold: true },
  { x: 176, y: 192, key: 'padel', size: 8, color: ink, bold: true },
  { x: 270, y: 108, key: 'hall1', size: 7.5, color: ink },
  { x: 282, y: 117, key: 'hall2', size: 7.5, color: ink },
  { x: 324, y: 120, key: 'main1', size: 7.5, color: ink },
  { x: 324, y: 129, key: 'main2', size: 7.5, color: ink },
  { x: 325, y: 38, key: 'mosque', size: 7.5, color: ink },
  { x: 256, y: 128, key: 'center1', size: 7.5, color: ink },
  { x: 256, y: 137, key: 'center2', size: 7.5, color: ink },
];

const cartPins = [
  { x: 296, y: 142 },
  { x: 112, y: 140 },
  { x: 210, y: 160 },
];

export function CampusMap({ style }: { style?: ViewStyle }) {
  const { language } = useI18n();
  const L = labels[language];
  const [width, setWidth] = useState(0);
  const k = width / W;
  const box = (b: { x: number; y: number; w: number; h: number }): ViewStyle => ({
    position: 'absolute',
    left: b.x * k,
    top: b.y * k,
    width: b.w * k,
    height: b.h * k,
  });

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.map, { height: width ? H * k : 240 }, style]}
      // The map is decorative; screen readers get the cart list and shuttle card instead.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 && (
        <>
          {blocks.map((b, i) => (
            <View
              key={i}
              style={[
                box(b),
                {
                  backgroundColor: b.bg,
                  borderRadius: (b.r ?? 0) * k,
                  borderWidth: b.border ? 1.2 : 0,
                  borderColor: b.border,
                },
              ]}
            />
          ))}
          <MapText k={k} x={56} y={40} size={11} color={muted} bold>
            P
          </MapText>
          <MapText k={k} x={286} y={37} size={11} color="#F68938" bold>
            P
          </MapText>
          {textLabels.map((l) => (
            <MapText key={l.key} k={k} x={l.x} y={l.y} size={l.size} color={l.color} bold={l.bold}>
              {L[l.key]}
            </MapText>
          ))}
          <View style={[box({ x: 332, y: 100, w: 14, h: 14 }), styles.center]}>
            <Icon name="star" size={14 * k} color="#F68938" />
          </View>
          <View
            style={[box({ x: 380, y: 129, w: 8, h: 71 }), styles.center, { overflow: 'visible' }]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.text,
                {
                  width: 90 * k,
                  fontSize: 7 * k,
                  color: muted,
                  fontFamily: fontFamily.semibold,
                  transform: [{ rotate: '-90deg' }],
                  textAlign: 'center',
                },
              ]}
            >
              {L.east}
            </Text>
          </View>
          <Tag k={k} x={312} y={166} bg="#F68938" size={7}>
            {L.gate}
          </Tag>
          <View
            style={[
              box({ x: 374, y: 145, w: 1, h: 95 }),
              { borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: ink },
            ]}
          />
          <Tag k={k} x={318} y={206} bg="#0B0B0C" size={8}>
            {L.sab}
          </Tag>
          {cartPins.map((p, i) => (
            <Pin key={i} k={k} x={p.x} y={p.y} size={24} bg="#F68938" icon="cart" />
          ))}
          <Pin k={k} x={367} y={182} size={30} bg="#000000" icon="bus" />
          <View
            style={[
              box({ x: 66, y: 106, w: 18, h: 18 }),
              styles.center,
              {
                borderRadius: 9 * k,
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#F68938',
              },
            ]}
          >
            <Icon name="food" size={11 * k} color="#F68938" />
          </View>
          <View
            style={[
              box({ x: 86, y: 40, w: 26, h: 26 }),
              { borderRadius: 13 * k, backgroundColor: 'rgba(61,123,247,0.2)' },
            ]}
          />
          <View
            style={[
              box({ x: 93, y: 47, w: 12, h: 12 }),
              {
                borderRadius: 6 * k,
                backgroundColor: '#3D7BF7',
                borderWidth: 2,
                borderColor: '#FFFFFF',
              },
            ]}
          />
          <View
            style={[
              styles.legend,
              {
                left: 20 * k,
                top: 212 * k,
                gap: 8 * k,
                paddingHorizontal: 8 * k,
                paddingVertical: 5 * k,
              },
            ]}
          >
            {(
              [
                ['#F68938', L.cart],
                ['#000000', L.shuttle],
                ['#3D7BF7', L.you],
              ] as const
            ).map(([c, label]) => (
              <View key={label} style={[styles.legendItem, { gap: 4 * k }]}>
                <View
                  style={{ width: 8 * k, height: 8 * k, borderRadius: 4 * k, backgroundColor: c }}
                />
                <Text
                  style={[
                    styles.text,
                    { fontSize: 9 * k, color: ink, fontFamily: fontFamily.medium },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function MapText(props: {
  k: number;
  x: number;
  y: number;
  size: number;
  color: string;
  bold?: boolean;
  children: string;
}) {
  const { k, x, y, size, color, bold, children } = props;
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.text,
        {
          left: x * k,
          top: y * k,
          fontSize: size * k,
          color,
          fontFamily: bold ? fontFamily.bold : fontFamily.semibold,
        },
      ]}
    >
      {children}
    </Text>
  );
}

function Tag({
  k,
  x,
  y,
  bg,
  size,
  children,
}: {
  k: number;
  x: number;
  y: number;
  bg: string;
  size: number;
  children: string;
}) {
  return (
    <View
      style={[
        styles.tag,
        {
          left: x * k,
          top: y * k,
          backgroundColor: bg,
          borderRadius: 5 * k,
          paddingHorizontal: 5 * k,
          paddingVertical: 2 * k,
        },
      ]}
    >
      <Text style={{ fontSize: size * k, color: '#FFFFFF', fontFamily: fontFamily.bold }}>
        {children}
      </Text>
    </View>
  );
}

function Pin({
  k,
  x,
  y,
  size,
  bg,
  icon,
}: {
  k: number;
  x: number;
  y: number;
  size: number;
  bg: string;
  icon: IconName;
}) {
  return (
    <View
      style={[
        styles.center,
        {
          position: 'absolute',
          left: x * k,
          top: y * k,
          width: size * k,
          height: size * k,
          borderRadius: (size / 2) * k,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.2)',
        },
      ]}
    >
      <Icon name={icon} size={size * 0.55 * k} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: '#F2EBDB', borderRadius: 18, overflow: 'hidden', direction: 'ltr' },
  center: { alignItems: 'center', justifyContent: 'center' },
  text: { position: 'absolute' },
  tag: { position: 'absolute' },
  legend: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.12)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
});
