import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';

// Rows the fake database returns, per table.
const mockRows: Record<string, unknown> = {};
const mockSignOut = jest.fn(() => Promise.resolve({ error: null }));
// What a relaunch finds saved on the device (null = nobody signed in).
let mockSaved: { user: { id: string } } | null = null;

function mockBuilder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'single', 'maybeSingle']) b[m] = () => b;
  b.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) =>
    Promise.resolve({ data: mockRows[table] ?? null, error: null }).then(ok, bad);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  isBackendConfigured: true,
  supabase: {
    from: (table: string) => mockBuilder(table),
    auth: {
      getSession: () => Promise.resolve({ data: { session: mockSaved } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }),
      signOut: () => mockSignOut(),
    },
  },
}));

import { authUserId } from '@/services/backend';
import { SessionProvider, useSession } from '@/services/session';

const holder: { current: ReturnType<typeof useSession> | null } = { current: null };
const api = () => holder.current!;
const seenByChildEffect: (string | null)[] = [];

// Stands in for the data loader: a descendant whose effect runs when the user changes.
function Probe() {
  const value = useSession();
  useEffect(() => {
    holder.current = value;
  });
  useEffect(() => {
    if (value.session?.userId) seenByChildEffect.push(authUserId.get());
  }, [value.session?.userId]);
  return null;
}

async function mount() {
  await render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  seenByChildEffect.length = 0;
  mockSignOut.mockClear();
  mockSaved = null;
  mockRows.club_members = [];
  mockRows.instructors = null;
  mockRows.restaurants = [];
  mockRows.profiles = {
    role: 'student',
    full_name: 'Amro Elian',
    email: 'a@yu.edu.sa',
    phone: null,
  };
});

test('the user id is already stored when a child effect sees the new session', async () => {
  await mount();
  await act(async () => {
    await api().signInStudent('a@yu.edu.sa', 'pw');
  });
  expect(seenByChildEffect).toEqual(['u1']); // was null before the fix -> "You need to be signed in"
});

test('a relaunch restores a saved student but not a saved guest', async () => {
  mockSaved = { user: { id: 'u1' } };
  await mount();
  expect(api().session?.role).toBe('student');

  mockRows.profiles = { role: 'guest', full_name: 'Sara', email: null, phone: '+966555123456' };
  mockSignOut.mockClear();
  await mount();
  expect(api().session).toBeNull(); // starts at Login, not in the old guest session
  expect(mockSignOut).toHaveBeenCalled();
});

test('a student account stays a student (no staff screens)', async () => {
  await mount();
  let role = '';
  await act(async () => {
    role = (await api().signInStudent('a@yu.edu.sa', 'pw')).role;
  });
  expect(role).toBe('student');
});

test('profile role admin becomes the university admin through staff login only', async () => {
  mockRows.profiles = { role: 'admin', full_name: 'Affairs', email: 'x@yu.edu.sa', phone: null };
  await mount();
  let viaStudent = '';
  let viaStaff = '';
  await act(async () => {
    viaStudent = (await api().signInStudent('x@yu.edu.sa', 'pw')).role;
  });
  await act(async () => {
    viaStaff = (await api().signInStaff('x@yu.edu.sa', 'pw')).role;
  });
  expect([viaStudent, viaStaff]).toEqual(['student', 'uniAdmin']);
});

test('one account with every role opens the portal you ask for', async () => {
  mockRows.profiles = { role: 'admin', full_name: 'Demo', email: 'demo@yu.edu.sa', phone: null };
  mockRows.instructors = { slug: 'sarah' };
  mockRows.club_members = [{ clubs: { slug: 'gdg' } }];
  await mount();
  const roles: Record<string, string> = {};
  await act(async () => {
    roles.student = (await api().signInStudent('demo@yu.edu.sa', 'pw')).role;
    roles.instructor = (await api().signInStaff('demo@yu.edu.sa', 'pw', 'instructor')).role;
    roles.club = (await api().signInStaff('demo@yu.edu.sa', 'pw', 'clubAdmin')).role;
    roles.uni = (await api().signInStaff('demo@yu.edu.sa', 'pw', 'uniAdmin')).role;
  });
  expect(roles).toEqual({
    student: 'student',
    instructor: 'instructor',
    club: 'clubAdmin',
    uni: 'uniAdmin',
  });
});

test('staff login rejects a plain student and signs them out', async () => {
  await mount();
  await act(async () => {
    await expect(api().signInStaff('a@yu.edu.sa', 'pw')).rejects.toThrow('staff access');
  });
  expect(mockSignOut).toHaveBeenCalled();
  expect(api().session).toBeNull();
});

test('a club president gets the club admin role only through staff login', async () => {
  mockRows.club_members = [{ clubs: { slug: 'gdg' } }];
  await mount();
  let viaStudent = '';
  let viaStaff = '';
  await act(async () => {
    viaStudent = (await api().signInStudent('g@yu.edu.sa', 'pw')).role;
  });
  await act(async () => {
    viaStaff = (await api().signInStaff('g@yu.edu.sa', 'pw')).role;
  });
  expect([viaStudent, viaStaff]).toEqual(['student', 'clubAdmin']);
  expect(api().session?.clubId).toBe('gdg');
});

test('a restaurant account opens the Restaurant portal with its restaurant', async () => {
  mockRows.restaurants = [{ slug: 'kafton' }];
  await mount();
  let role = '';
  await act(async () => {
    role = (await api().signInStaff('kafton@yu.edu.sa', 'pw')).role;
  });
  expect(role).toBe('restaurant');
  expect(api().session?.restaurantId).toBe('kafton');
});
