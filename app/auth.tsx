import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Account from '../components/Account';
import Auth from '../components/auth';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <View>
      {session && session.user ? <Account key={session.user.id} session={session} /> : <Auth />}
    </View>
  );
}