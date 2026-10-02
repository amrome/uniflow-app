import { useEffect, type ReactNode } from 'react';

import { ErrorToaster } from '@/components/ui/ErrorToaster';

import { hydrateAffairs, refreshTicket, affairsServicesStore, ticket } from './affairs';
import { db, live } from './backend';
import { reportError } from './errors';
import { clubsStore, events, going, hydrateEvents } from './events';
import { favoriteRestaurants, hydrateFood, pastOrders, restaurantsStore } from './food';
import { freeZonesStore, hydrateParking, paidZoneStore, reservation, spotAlerts } from './parking';
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
import { golfCartsStore, hydrateTransport, shuttleTimetable } from './transport';

/** Loads everything the signed-in user can see. Each part fails on its own (and is reported). */
export async function hydrateAll() {
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
}

/** Empties every store when someone signs out, so the next person never sees the last one's data. */
export function resetData() {
  [
    restaurantsStore,
    pastOrders,
    shuttleTimetable,
    golfCartsStore,
    paidZoneStore,
    freeZonesStore,
    reservation,
    events,
    clubsStore,
    going,
    instructorsStore,
    portal,
    timetables,
    affairsServicesStore,
    ticket,
    profileStore,
  ].forEach((store) => store.reset());
  [favoriteRestaurants, spotAlerts, favoriteInstructors, notifyInstructors].forEach((set) =>
    set.reset(),
  );
}

const debounced = (fn: () => Promise<unknown>) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => fn().catch(() => {}), 400);
  };
};

/** Live updates: parking counts push instantly; the queue is re-read when anything changes. */
function subscribeLive(): () => void {
  const client = db();
  const parking = debounced(hydrateParking);
  const queue = debounced(hydrateAffairs);
  const channel = client
    .channel('uniflow-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, parking)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_lots' }, parking)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, queue)
    .subscribe();
  // Other people being served doesn't change *your* row, so also re-check your place regularly.
  const poll = setInterval(() => {
    if (ticket.get()) refreshTicket().catch(() => {});
  }, 15_000);
  return () => {
    clearInterval(poll);
    client.removeChannel(channel);
  };
}

/** Fills the stores from Supabase after sign-in and keeps them live. Does nothing without a backend. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.userId;

  useEffect(() => {
    if (!live) return;
    if (!userId) {
      resetData();
      return;
    }
    hydrateAll();
    return subscribeLive();
  }, [userId]);

  return (
    <>
      {children}
      <ErrorToaster />
    </>
  );
}
