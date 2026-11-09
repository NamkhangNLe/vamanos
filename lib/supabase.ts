import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * True when a Supabase project is configured via env vars.
 * When false the app runs in local-first demo mode (AsyncStorage),
 * so it works out of the box with zero setup.
 */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('http') && supabaseAnonKey.length > 0

/**
 * The Supabase client, or null when no project is configured.
 * Never call createClient with an empty URL: it throws at import time
 * and would crash the whole app before it can fall back to local mode.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null
