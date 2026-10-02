import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ConfirmDialog, LangToggle, TopBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useSession } from '@/services/session';
import { useTheme } from '@/theme';

/**
 * Top bar for staff home screens (13.1 / 13.2 / 13.4). There's no tab bar on the staff side, so
 * "back" from a portal root means leaving the portal — confirm before signing out.
 */
export function StaffRootBar({ title }: { title: string }) {
  const { t } = useI18n();
  const { signOut } = useSession();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <TopBar title={title} right={<LangToggle />} onBack={() => setConfirm(true)} />
      <ConfirmDialog
        visible={confirm}
        icon="↩"
        title={t.staffPortal.logoutTitle}
        body={t.staffPortal.logoutBody}
        keepLabel={t.staffPortal.stay}
        confirmLabel={t.staffPortal.logout}
        onKeep={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          signOut(); // the navigation guards bring you back to Login
        }}
      />
    </>
  );
}

/** Figma AdminHeader: ink card with a brand avatar, name, role line and an ADMIN tag. */
export function StaffHeader({
  initials,
  name,
  role,
}: {
  initials: string;
  name: string;
  role: string;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.inkPrimary }]}>
      <View style={[styles.avatar, { backgroundColor: colors.brandPrimary }]}>
        <AppText variant="title" weight="bold" tone="onBrand">
          {initials}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="headingSmall" style={styles.white} numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" style={{ color: colors.inkOnInkMuted }} numberOfLines={1}>
          {role}
        </AppText>
      </View>
      <View style={[styles.tag, { backgroundColor: colors.brandPrimary }]}>
        <AppText size={10} weight="bold" tone="onBrand">
          {t.staffPortal.admin}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  white: { color: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
