import { Redirect } from 'expo-router';

import { staffHome, useSession } from '@/services/session';

/** Entry: route by who is signed in. */
export default function Index() {
  const { session } = useSession();
  if (!session) return <Redirect href="/login" />;
  if (session.role === 'guest') return <Redirect href="/guest" />;
  if (session.role === 'student') return <Redirect href="/home" />;
  return <Redirect href={staffHome[session.role]} />;
}
