import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { mockProfile } from '@/mocks/profile';

// Who is using the app. Staff roles come from the Staff Login screen (13 · Staff Login); the
// role is "detected from the YU account" — mocked here by the email or demo-account chip.
export type Role = 'student' | 'guest' | 'instructor' | 'clubAdmin' | 'uniAdmin';

export type Session = {
  role: Role;
  name: string;
  email?: string;
  phone?: string;
};

type SessionContextValue = {
  session: Session | null;
  signInStudent: (email: string) => void;
  signInGuest: (name: string, contact: string) => void;
  signInStaff: (email: string, role?: Exclude<Role, 'student' | 'guest'>) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** Mock role detection: club/president → club admin, staff/admin → university, else instructor. */
export function detectStaffRole(email: string): Exclude<Role, 'student' | 'guest'> {
  const e = email.toLowerCase();
  if (e.includes('president') || e.includes('club')) return 'clubAdmin';
  if (e.includes('admin') || e.includes('staff') || e.includes('affairs')) return 'uniAdmin';
  return 'instructor';
}

/** Landing screen for each staff role (13.1 Instructor Portal, 13.2 Club Admin, 13.4 University Admin). */
export const staffHome = {
  instructor: '/staff/instructor',
  clubAdmin: '/staff/club',
  uniAdmin: '/staff/admin',
} as const;

export const staffDemoEmails = {
  instructor: 's.alotaibi@yu.edu.sa',
  clubAdmin: 'gdg.president@yu.edu.sa',
  uniAdmin: 'student.affairs@yu.edu.sa',
} as const;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signInStudent: (email) =>
        setSession({
          role: 'student',
          name: mockProfile.fullName,
          email: email || mockProfile.email,
        }),
      signInGuest: (name, contact) =>
        setSession({ role: 'guest', name: name || 'Guest', phone: contact }),
      signInStaff: (email, role) =>
        setSession({ role: role ?? detectStaffRole(email), name: email.split('@')[0], email }),
      signOut: () => setSession(null),
    }),
    [session],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
