import { useSyncExternalStore } from 'react';

/**
 * Tiny observable store for prototype state shared across screens (favourites, bookings,
 * reservations…). Replace with server state when the backend lands.
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
  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, use };
}

/** A set of ids that can be toggled (favourite restaurants, instructors…). */
export function createToggleSet(initial: string[]) {
  const store = createStore<readonly string[]>(initial);
  return {
    use: store.use,
    toggle: (id: string) =>
      store.set((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    has: (id: string) => store.get().includes(id),
  };
}
