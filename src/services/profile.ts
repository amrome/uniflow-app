import { mockProfile } from '@/mocks/profile';

import { db, live, ok, requireUserId } from './backend';
import { useSession } from './session';
import { createStore } from './store';

// Service boundary: screens only ever see this shape, whether it comes from the mock or Supabase.
export type Profile = {
  fullName: string;
  phone: string;
  email: string;
  /** University ID, e.g. "2023-11430" (managed by the university, read-only). */
  studentId: string;
  majorKey: string | null;
  level: number | null;
};

const blank: Profile = {
  fullName: '',
  phone: '',
  email: '',
  studentId: '',
  majorKey: null,
  level: null,
};

export const profileStore = createStore<Profile>(
  live ? blank : { ...mockProfile, majorKey: 'software', level: 6 },
);

export const useProfile = profileStore.useValue;

/**
 * The name to show for the signed-in user (greeting, avatar, profile). It follows edits made in
 * Edit Profile. An address like "202311430@yu.edu.sa" is never shown as a name: '' means "unknown".
 */
export function useDisplayName(): string {
  const profile = useProfile();
  const { session } = useSession();
  const fromSession = session?.name && !/^\d+$/.test(session.name) ? session.name : '';
  // A guest has no profile to edit: the name they typed when registering is the right one.
  if (session?.role === 'guest') return fromSession || profile.fullName.trim();
  return profile.fullName.trim() || fromSession;
}

type Row = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  university_id: string | null;
  major_key: string | null;
  level: number | null;
};

export async function getProfile(): Promise<Profile> {
  if (!live) return profileStore.get();
  const row = await ok<Row>(
    db()
      .from('profiles')
      .select('full_name, phone, email, university_id, major_key, level')
      .eq('id', requireUserId())
      .single(),
  );
  const profile: Profile = {
    fullName: row.full_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    studentId: row.university_id ?? '',
    majorKey: row.major_key,
    level: row.level,
  };
  profileStore.set(profile);
  return profile;
}

/** Name and phone are editable; e-mail, university ID, major and level are managed by the university. */
export async function updateProfile(patch: Partial<Pick<Profile, 'fullName' | 'phone' | 'email'>>) {
  if (live) {
    const update: Record<string, string> = {};
    if (patch.fullName !== undefined) update.full_name = patch.fullName;
    if (patch.phone !== undefined) update.phone = patch.phone;
    if (Object.keys(update).length) {
      await ok(db().from('profiles').update(update).eq('id', requireUserId()));
    }
    const { email: _ignored, ...editable } = patch;
    profileStore.set((p) => ({ ...p, ...editable }));
  } else {
    profileStore.set((p) => ({ ...p, ...patch }));
  }
  return profileStore.get();
}
