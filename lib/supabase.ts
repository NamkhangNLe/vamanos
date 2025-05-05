import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = https://cmcfhfctptnojzoygujy.supabase.co
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtY2ZoZmN0cHRub2p6b3lndWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MTQwMTEsImV4cCI6MjA2MTM5MDAxMX0.g0qkl2XFXAZB5XmI0X7H3SdFpknR3biyVAMXdqlOsiA

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
