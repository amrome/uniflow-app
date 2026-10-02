import { useSyncExternalStore } from 'react';

// Background writes (favourites, RSVPs…) are optimistic; when one fails the store rolls back and
// reports here. <ErrorToaster /> shows the latest one as a toast.
export type AppError = { id: number; message: string };

let current: AppError | null = null;
const listeners = new Set<() => void>();

export function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    return e.message;
  }
  return 'Something went wrong';
}

export function reportError(e: unknown) {
  const message = errorMessage(e);
  console.warn('[uniflow]', message);
  current = { id: (current?.id ?? 0) + 1, message };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function useLastError(): AppError | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}
