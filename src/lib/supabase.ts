import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';

// Set these in .env (see .env.example). Without them the app runs on its built-in mock data,
// exactly like the prototype, so nothing breaks before a Supabase project exists.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function create(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Only refresh the token while the app is in the foreground (Supabase's React Native advice).
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
  return client;
}

/** The Supabase client, or null when the app runs on mock data. */
export const supabase = create();
export const isBackendConfigured = supabase !== null;
