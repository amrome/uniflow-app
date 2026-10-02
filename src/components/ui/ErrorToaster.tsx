import { useEffect, useRef } from 'react';

import { useI18n } from '@/i18n';
import { useLastError } from '@/services/errors';

import { useToast } from './Toast';

/** Shows failed background saves (RSVP, favourites, bookings…) as a toast. Renders nothing. */
export function ErrorToaster() {
  const error = useLastError();
  const toast = useToast();
  const { t } = useI18n();
  const shown = useRef(0);

  useEffect(() => {
    if (!error || error.id === shown.current) return;
    shown.current = error.id;
    toast.show({ emoji: '⚠️', title: t.common.error, body: error.message });
  }, [error, toast, t]);

  return null;
}
