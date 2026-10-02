import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';

// Rows the fake database returns, per table.
const mockRows: Record<string, unknown> = {};
const mockSignOut = jest.fn(() => Promise.resolve({ error: null }));

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
      getSession: () => Promise.resolve({ data: { session: null } }),
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
  mockRows.club_members = [];
  mockRows.instructors = null;
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

test('a student account stays a student (no staff screens)', async () => {
  await mount();
  let role = '';
  await act(async () => {
    role = (await api().signInStudent('a@yu.edu.sa', 'pw')).role;
  });
  expect(role).toBe('student');
});

test('profile role admin becomes the university admin', async () => {
  mockRows.profiles = { role: 'admin', full_name: 'Affairs', email: 'x@yu.edu.sa', phone: null };
  await mount();
  let role = '';
  await act(async () => {
    role = (await api().signInStudent('x@yu.edu.sa', 'pw')).role;
  });
  expect(role).toBe('uniAdmin');
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
