import { useSyncExternalStore } from 'react';

import { reportError } from './errors';

/**
 * Tiny observable store for state shared across screens (favourites, bookings, reservations…).
 * With a Supabase backend it is the in-memory cache that the services fill and write through.
 */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  const get = () => state;
  const set = (next: T | ((prev: T) => T)) => {
    state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  };
  // Not named `use`: the React Compiler treats a bare `use()` as React's `use` API.
  const useValue = () => useSyncExternalStore(subscribe, get, get);
  const reset = () => set(initial);
  return { get, set, useValue, reset };
}

/**
 * A set of ids that can be toggled (favourite restaurants, instructors…).
 * `persist` saves each change in the background; if it fails the toggle is rolled back and the
 * error is reported (shown as a toast).
 */
export function createToggleSet(
  initial: string[],
  persist?: (id: string, on: boolean) => Promise<unknown>,
) {
  const store = createStore<readonly string[]>(initial);
  const has = (id: string) => store.get().includes(id);
  return {
    useValue: store.useValue,
    get: store.get,
    has,
    reset: store.reset,
    replace: (ids: readonly string[]) => store.set(ids),
    toggle: (id: string) => {
      const was = has(id);
      store.set((prev) => (was ? prev.filter((x) => x !== id) : [...prev, id]));
      if (!persist) return;
      (async () => persist(id, !was))().catch((e) => {
        store.set((prev) =>
          was ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id),
        );
        reportError(e);
      });
    },
  };
}
