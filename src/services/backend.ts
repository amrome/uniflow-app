import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import { createStore } from './store';

/** True when a Supabase project is configured; otherwise every service serves its mock data. */
export const live = supabase !== null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error('The backend is not configured');
  return supabase;
}

type Result = { data: unknown; error: { message: string } | null };

/** Unwraps a Supabase response: returns the data or throws the error. */
export async function ok<T = unknown>(query: PromiseLike<Result>): Promise<T> {
  const { data, error } = await query;
  if (error) throw error;
  return data as T;
}

/** PostgREST returns at most 1000 rows per request; read page by page until done. */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<Result>,
): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const chunk = await ok<T[]>(page(from, from + size - 1));
    rows.push(...chunk);
    if (chunk.length < size) return rows;
  }
}

/** A bilingual column pair as the app uses it. Missing Arabic falls back to English. */
export function bi(en: string | null | undefined, ar: string | null | undefined) {
  return { en: en ?? '', ar: ar || en || '' };
}

/** The signed-in user's id; set by SessionProvider. */
export const authUserId = createStore<string | null>(null);

export function requireUserId(): string {
  const id = authUserId.get();
  if (!id) throw new Error('You need to be signed in');
  return id;
}
