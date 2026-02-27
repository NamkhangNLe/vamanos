import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Account from '../components/Account';
import Auth from '../components/auth';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const handleWaitlistSuccess = async () => {
    try {
      // Set the bypass flag so RootLayout allows us in
      await AsyncStorage.setItem('vamanos_waitlist_bypassed', 'true');
      // Immediate redirect to the map
      router.replace('/');
    } catch (e) {
      console.warn('Error saving bypass status', e);
      router.replace('/');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {session && session.user ? (
        <Account key={session.user.id} session={session} />
      ) : (
        <Auth onSuccess={handleWaitlistSuccess} />
      )}
    </View>
  );
}