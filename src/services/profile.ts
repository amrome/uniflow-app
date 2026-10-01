import { mockProfile, type Profile } from '@/mocks/profile';

// Service boundary: swap the mock for a real API (Supabase/Firebase) in the backend phase
// without touching any screen code.
let current: Profile = { ...mockProfile };

export async function getProfile(): Promise<Profile> {
  return current;
}

export async function updateProfile(patch: Partial<Pick<Profile, 'fullName' | 'phone' | 'email'>>) {
  current = { ...current, ...patch };
  return current;
}
