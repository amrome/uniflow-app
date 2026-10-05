import { LinearGradient } from 'expo-linear-gradient';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { gradients } from '@/theme';

import { AppText } from './AppText';
import { toastEntering, toastExiting } from './Reveal';

type ToastInput = { emoji: string; title: string; body: string };
type ToastContextValue = { show: (toast: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Figma Toast/* frames (ShuttleReminder, NotifyMe, SpotAlert): an iOS-style notification banner
 * that drops in from the top. Prototype stand-in for real push notifications.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { language } = useI18n();

  const show = useCallback((t: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3800);
  }, []);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          key={toast.key}
          entering={toastEntering}
          exiting={toastExiting}
          style={[styles.wrap, { top: insets.top + 4 }]}
          pointerEvents="box-none"
        >
          <Pressable accessibilityRole="alert" onPress={() => setToast(null)} style={styles.card}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.714]}
              style={styles.icon}
            >
              <AppText size={19}>{toast.emoji}</AppText>
            </LinearGradient>
            <View style={styles.text}>
              <View style={styles.meta}>
                <AppText variant="tiny" weight="semibold" style={styles.muted}>
                  UNIFLOW
                </AppText>
                <AppText variant="tiny" weight="regular" style={styles.muted}>
                  {language === 'ar' ? 'الآن' : 'now'}
                </AppText>
              </View>
              <AppText variant="bodyStrong" style={{ color: '#121214' }}>
                {toast.title}
              </AppText>
              <AppText variant="label" weight="regular" style={{ color: '#404045' }}>
                {toast.body}
              </AppText>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  card: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: 'rgba(250,250,250,0.97)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.6)',
    boxShadow: '0px 10px 15px 0px rgba(0,0,0,0.18)',
  },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: '#73737A' },
});
