import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Initial setup: Load session and initial bypass status
  useEffect(() => {
    async function setup() {
      // 1. Get session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      // 2. Initial bypass check
      const bypass = await AsyncStorage.getItem('vamanos_waitlist_bypassed');
      if (bypass === 'true') {
        setIsBypassed(true);
      }

      setInitialized(true);
    }

    setup();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Navigation Guard logic
  useEffect(() => {
    if (!initialized) return;

    async function evaluateNavigation() {
      // Re-verify bypass status in case it was just set in Another screen
      const bypass = await AsyncStorage.getItem('vamanos_waitlist_bypassed');
      const currentlyBypassed = bypass === 'true';
      if (currentlyBypassed !== isBypassed) {
        setIsBypassed(currentlyBypassed);
        // Effect will re-run after state update
        return;
      }

      const inAuthGroup = segments[0] === 'auth';
      const hasAccess = !!session || currentlyBypassed;

      if (!hasAccess && !inAuthGroup) {
        // Not logged in or bypassed? Send to signup
        router.replace('/auth');
      } else if (hasAccess && inAuthGroup) {
        // Logged in or bypassed? Go to the app
        router.replace('/');
      }
    }

    evaluateNavigation();
  }, [session, isBypassed, initialized, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
