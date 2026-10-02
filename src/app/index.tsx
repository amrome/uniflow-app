import { Redirect } from 'expo-router';

import { staffHome, useSession } from '@/services/session';

/** Entry: route by who is signed in. */
export default function Index() {
  const { session, ready } = useSession();
  if (!ready) return null; // still restoring a saved sign-in
  if (!session) return <Redirect href="/login" />;
  if (session.role === 'guest') return <Redirect href="/guest" />;
  if (session.role === 'student') return <Redirect href="/home" />;
  return <Redirect href={staffHome[session.role]} />;
}
