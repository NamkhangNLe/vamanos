import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

// Demo mode (no Supabase configured): the GitHub Pages demo is open by
// construction. There are no accounts, no sessions, and no waitlist wall —
// the root route shows the squad map with seeded demo data. The guard below
// treats demo mode as full access, so the demo can never bounce an
// unauthenticated visitor to /auth, whatever order the effects fire in.
const DEMO_MODE = !isSupabaseConfigured || !supabase;

export default function RootLayout() {
  const [authed, setAuthed] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Initial setup: session + waitlist bypass
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function setup() {
      // Local/demo mode (no Supabase configured): no accounts, straight in.
      if (DEMO_MODE) {
        setAuthed(true);
        setInitialized(true);
        return;
      }

      const { data } = await supabase!.auth.getSession();
      const bypass = await AsyncStorage.getItem('vamanos_waitlist_bypassed');
      setAuthed(!!data.session || bypass === 'true');
      setInitialized(true);

      const { data: listener } = supabase!.auth.onAuthStateChange((_event, session) => {
        setAuthed(!!session);
      });
      subscription = listener.subscription;
    }

    setup();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Navigation guard
  useEffect(() => {
    if (!initialized) return;

    async function evaluateNavigation() {
      const bypass = await AsyncStorage.getItem('vamanos_waitlist_bypassed');
      const hasAccess = DEMO_MODE || authed || bypass === 'true';
      const inAuthGroup = segments[0] === 'auth';

      if (!hasAccess && !inAuthGroup) {
        router.replace('/auth');
      } else if (hasAccess && inAuthGroup) {
        router.replace('/');
      }
    }

    evaluateNavigation();
  }, [authed, initialized, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
