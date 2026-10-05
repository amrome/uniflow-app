import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { mockProfile } from '@/mocks/profile';

import { authUserId, db, live, ok } from './backend';

// Who is using the app. Staff roles come from the Staff Login screen (13 · Staff Login). With a
// backend the role is decided by the database (profiles.role + the pre-approved staff_emails
// list); without one it is detected from the email, as in the prototype.
export type Role = 'student' | 'guest' | 'instructor' | 'clubAdmin' | 'uniAdmin' | 'restaurant';
export type StaffRole = Exclude<Role, 'student' | 'guest'>;

export type Session = {
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  userId?: string;
  /** Slug of the instructor row linked to this account (instructors). */
  instructorId?: string;
  /** Slug of the club this account administers (club admins). */
  clubId?: string;
  /** Slug of the restaurant this account runs (the restaurant's iPad). */
  restaurantId?: string;
};

type SessionContextValue = {
  /** False until a saved session has been restored (backend only). */
  ready: boolean;
  session: Session | null;
  signInStudent: (email: string, password?: string) => Promise<Session>;
  /** 'confirmEmail' when the project requires the e-mail to be verified first. */
  signUp: (name: string, email: string, password: string) => Promise<'signedIn' | 'confirmEmail'>;
  signInGuest: (name: string, contact: string) => Promise<Session>;
  signInStaff: (email: string, password?: string, role?: StaffRole) => Promise<Session>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Mock role detection: restaurant/kitchen → restaurant, club/president → club admin,
 * staff/admin → university, else instructor.
 */
export function detectStaffRole(email: string): StaffRole {
  const e = email.toLowerCase();
  if (e.includes('restaurant') || e.includes('kitchen') || e.includes('kafton')) return 'restaurant';
  if (e.includes('president') || e.includes('club')) return 'clubAdmin';
  if (e.includes('admin') || e.includes('staff') || e.includes('affairs')) return 'uniAdmin';
  return 'instructor';
}

/** Landing screen for each staff role (13.1 Instructor Portal, 13.2 Club Admin, 13.4 University Admin). */
export const staffHome = {
  instructor: '/staff/instructor',
  clubAdmin: '/staff/club',
  uniAdmin: '/staff/admin',
  restaurant: '/staff/restaurant',
} as const;

export const staffDemoEmails = {
  instructor: 's.alotaibi@yu.edu.sa',
  clubAdmin: 'gdg.president@yu.edu.sa',
  uniAdmin: 'student.affairs@yu.edu.sa',
  restaurant: 'kafton.restaurant@yu.edu.sa',
} as const;

const STAFF_MODE_KEY = 'uniflow.staffMode';

// Demo switch (see "Demo mode" in CLAUDE.md): EXPO_PUBLIC_SKIP_AUTH=1 opens the app straight on the
// student Home. With a backend it signs in the demo account EXPO_PUBLIC_DEMO_EMAIL / _PASSWORD so
// writes (orders, reservations) still belong to a real user.
const SKIP_AUTH = process.env.EXPO_PUBLIC_SKIP_AUTH === '1';
const DEMO_EMAIL = process.env.EXPO_PUBLIC_DEMO_EMAIL ?? '';
const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? '';
const mockStudent = (): Session => ({
  role: 'student',
  name: mockProfile.fullName,
  email: mockProfile.email,
});

type ProfileRow = {
  role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

const STAFF_ROLES: StaffRole[] = ['instructor', 'clubAdmin', 'uniAdmin', 'restaurant'];

/**
 * Builds the app session for a signed-in user from the database.
 * One account can hold several roles (university admin, instructor, club admin, restaurant). The
 * login screen decides which portal opens: the normal Login is always the student portal; the
 * Staff login opens `wantRole` when the account has it, otherwise the account's first staff role.
 */
async function loadSession(user: User, asStaff: boolean, wantRole?: StaffRole): Promise<Session> {
  const client = db();
  const [profile, clubs, instructor, restaurants] = await Promise.all([
    ok<ProfileRow>(
      client.from('profiles').select('role, full_name, email, phone').eq('id', user.id).single(),
    ),
    ok<{ clubs: { slug: string } | null }[]>(
      client.from('club_members').select('clubs(slug)').eq('user_id', user.id).eq('role', 'admin'),
    ),
    ok<{ slug: string } | null>(
      client.from('instructors').select('slug').eq('profile_id', user.id).maybeSingle(),
    ),
    ok<{ slug: string }[] | null>(
      client.from('restaurants').select('slug').eq('manager_id', user.id),
    ),
  ]);
  const clubId = clubs[0]?.clubs?.slug ?? undefined;
  const restaurantId = restaurants?.[0]?.slug ?? undefined;
  const can: StaffRole[] = [];
  if (profile.role === 'admin' || profile.role === 'affairs') can.push('uniAdmin');
  if (profile.role === 'instructor' || instructor) can.push('instructor');
  if (clubId) can.push('clubAdmin');
  if (restaurantId) can.push('restaurant');
  let role: Role;
  if (profile.role === 'guest') role = 'guest';
  else if (!asStaff) role = 'student';
  else role = wantRole && can.includes(wantRole) ? wantRole : (can[0] ?? 'student');
  return {
    role,
    name: profile.full_name || profile.email?.split('@')[0] || 'Guest',
    email: profile.email ?? undefined,
    phone: profile.phone ?? undefined,
    userId: user.id,
    instructorId: instructor?.slug,
    clubId,
    restaurantId,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() =>
    SKIP_AUTH && !live ? mockStudent() : null,
  );
  const [ready, setReady] = useState(!live);

  // The user id is stored *before* React re-renders, so effects further down the tree (the data
  // loader) can already use it. Setting it in an effect here ran too late: child effects run first.
  const setSession = useCallback((next: Session | null) => {
    authUserId.set(next?.userId ?? null);
    setSessionState(next);
  }, []);

  // Restore a saved sign-in (and listen for the token being revoked).
  useEffect(() => {
    if (!live) return;
    const client = db();
    let active = true;
    (async () => {
      try {
        const { data } = await client.auth.getSession();
        let restored: Session | null = null;
        if (data.session) {
          // STAFF_MODE_KEY holds the staff role chosen at Staff login ('1' from older versions).
          const saved = await AsyncStorage.getItem(STAFF_MODE_KEY);
          const savedRole = STAFF_ROLES.find((r) => r === saved);
          restored = await loadSession(data.session.user, !!saved, savedRole);
          if (restored.role === 'guest') {
            // A guest visit is temporary: the next launch starts at Login, not in the old guest session.
            restored = null;
            await client.auth.signOut().catch(() => {});
          }
        }
        if (!restored && SKIP_AUTH && DEMO_EMAIL) {
          const { data: signedIn, error } = await client.auth.signInWithPassword({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });
          if (!error && signedIn.user) restored = await loadSession(signedIn.user, false);
        }
        if (restored && active) setSession(restored);
      } catch {
        // offline or revoked: fall through to the login screen
      } finally {
        if (active) setReady(true);
      }
    })();
    const { data: sub } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setSession(null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession]);

  const signInStudent = useCallback(
    async (email: string, password = '') => {
      if (!live) {
        const s: Session = {
          role: 'student',
          name: mockProfile.fullName,
          email: email || mockProfile.email,
        };
        setSession(s);
        return s;
      }
      const client = db();
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      const s = await loadSession(data.user, false);
      await AsyncStorage.removeItem(STAFF_MODE_KEY).catch(() => {});
      setSession(s);
      return s;
    },
    [setSession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (!live) {
        setSession({ role: 'student', name: name || mockProfile.fullName, email });
        return 'signedIn' as const;
      }
      const client = db();
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) throw error;
      if (!data.session || !data.user) return 'confirmEmail' as const;
      setSession(await loadSession(data.user, false));
      return 'signedIn' as const;
    },
    [setSession],
  );

  const signInGuest = useCallback(
    async (name: string, contact: string) => {
      if (!live) {
        const s: Session = { role: 'guest', name: name || 'Guest', phone: contact };
        setSession(s);
        return s;
      }
      const client = db();
      const { data, error } = await client.auth.signInAnonymously({
        options: { data: { full_name: name, contact } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Could not start a guest session');
      const s = await loadSession(data.user, false);
      setSession(s);
      return s;
    },
    [setSession],
  );

  const signInStaff = useCallback(
    async (email: string, password = '', role?: StaffRole) => {
      if (!live) {
        const resolved = role ?? detectStaffRole(email);
        const s: Session = {
          role: resolved,
          name: email.split('@')[0],
          email,
          instructorId: resolved === 'instructor' ? 'sarah' : undefined,
          clubId: resolved === 'clubAdmin' ? 'gdg' : undefined,
          restaurantId: resolved === 'restaurant' ? 'kafton' : undefined,
        };
        setSession(s);
        return s;
      }
      const client = db();
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      const s = await loadSession(data.user, true, role);
      if (s.role === 'student' || s.role === 'guest') {
        await client.auth.signOut();
        throw new Error('This account does not have staff access');
      }
      await AsyncStorage.setItem(STAFF_MODE_KEY, s.role).catch(() => {});
      setSession(s);
      return s;
    },
    [setSession],
  );

  const signOut = useCallback(async () => {
    setSession(null); // screens react immediately; the server call can finish afterwards
    if (live) {
      await db()
        .auth.signOut()
        .catch(() => {});
      await AsyncStorage.removeItem(STAFF_MODE_KEY).catch(() => {});
    }
  }, [setSession]);

  const value = useMemo<SessionContextValue>(
    () => ({ ready, session, signInStudent, signUp, signInGuest, signInStaff, signOut }),
    [ready, session, signInStudent, signUp, signInGuest, signInStaff, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
