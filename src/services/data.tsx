import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { ErrorToaster } from '@/components/ui/ErrorToaster';

import { hydrateAffairs, refreshTickets, affairsServicesStore, tickets } from './affairs';
import { db, live } from './backend';
import { reportError } from './errors';
import { clubsStore, events, going, hydrateEvents } from './events';
import {
  favoriteRestaurants,
  hydrateFood,
  orderStatuses,
  pastOrders,
  refreshMyOrders,
  restaurantsStore,
} from './food';
import { hydrateKitchen, resetKitchen } from './kitchen';
import {
  freeZonesStore,
  hydrateParking,
  paidZoneStore,
  reservation,
  spotAlerts,
  zoneBays,
} from './parking';
import { getProfile, profileStore } from './profile';
import {
  favoriteInstructors,
  hydrateSchedules,
  instructorsStore,
  notifyInstructors,
  portal,
  timetables,
} from './schedules';
import { useSession } from './session';
import { createStore } from './store';
import { golfCartsStore, hydrateTransport, shuttleTimetable } from './transport';

/** True while the first load after sign-in is running (screens show skeletons meanwhile). */
export const dataLoading = createStore(false);
export const useDataLoading = dataLoading.useValue;

/** Loads everything the signed-in user can see. Each part fails on its own (and is reported). */
export async function hydrateAll() {
  dataLoading.set(true);
  await Promise.all(
    [
      getProfile,
      hydrateFood,
      hydrateTransport,
      hydrateParking,
      hydrateEvents,
      hydrateSchedules,
      hydrateAffairs,
    ].map((load) => load().catch(reportError)),
  );
  dataLoading.set(false);
}

/** Empties every store when someone signs out, so the next person never sees the last one's data. */
export function resetData() {
  dataLoading.set(false);
  [
    restaurantsStore,
    pastOrders,
    orderStatuses,
    shuttleTimetable,
    golfCartsStore,
    paidZoneStore,
    freeZonesStore,
    zoneBays,
    reservation,
    events,
    clubsStore,
    going,
    instructorsStore,
    portal,
    timetables,
    affairsServicesStore,
    tickets,
    profileStore,
  ].forEach((store) => store.reset());
  [favoriteRestaurants, spotAlerts, favoriteInstructors, notifyInstructors].forEach((set) =>
    set.reset(),
  );
  resetKitchen();
}

const debounced = (fn: () => Promise<unknown>) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => fn().catch(() => {}), 400);
  };
};

/**
 * Live updates: parking counts push instantly; the queue is re-read when anything changes.
 * Orders: the restaurant iPad (`kitchen` = its slug) re-reads its board, a student re-reads the
 * status of their own orders. Menus and open/closed changes reach students straight away.
 */
function subscribeLive(kitchen?: string): () => void {
  const client = db();
  const parking = debounced(hydrateParking);
  const queue = debounced(hydrateAffairs);
  const food = debounced(hydrateFood);
  const orders = kitchen ? debounced(() => hydrateKitchen(kitchen)) : debounced(refreshMyOrders);
  const channel = client
    .channel('uniflow-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, parking)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_lots' }, parking)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'parking_reservations' },
      parking,
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, queue)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, orders)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, food)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, food)
    .subscribe();
  // Other people being served doesn't change *your* row, so also re-check your place regularly.
  // The restaurant board is re-read too, in case a realtime message is missed.
  const poll = setInterval(() => {
    if (tickets.get().length) refreshTickets().catch(() => {});
    if (kitchen) hydrateKitchen(kitchen).catch(() => {});
    else if (Object.values(orderStatuses.get()).some((s) => s !== 'completed' && s !== 'cancelled'))
      refreshMyOrders().catch(() => {});
  }, 15_000);
  // Realtime pauses while the app is in the background: catch up when it comes back.
  const foreground = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    hydrateParking().catch(() => {});
    if (tickets.get().length) refreshTickets().catch(() => {});
    if (kitchen) hydrateKitchen(kitchen).catch(() => {});
    else refreshMyOrders().catch(() => {});
  });
  return () => {
    clearInterval(poll);
    foreground.remove();
    client.removeChannel(channel);
  };
}

/** Fills the stores from Supabase after sign-in and keeps them live. Does nothing without a backend. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.userId;
  const kitchen = session?.role === 'restaurant' ? session.restaurantId : undefined;

  useEffect(() => {
    if (!live) return;
    if (!userId) {
      resetData();
      return;
    }
    hydrateAll();
    if (kitchen) hydrateKitchen(kitchen).catch(reportError);
    return subscribeLive(kitchen);
  }, [userId, kitchen]);

  return (
    <>
      {children}
      <ErrorToaster />
    </>
  );
}
