import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// TODO: Move these to environment variables
const SUPABASE_URL = "https://jfbbrlekjmvoprswqzoc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_n6I0jso31I6gt3P2z0KqzQ_4Ld2L8DU";

/**
 * Supabase client instance
 * Configured with platform-specific storage for session persistence
 * - Web: Uses localStorage and detects OAuth callbacks in URL
 * - Native: Uses AsyncStorage
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage, // Use default localStorage on web
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable OAuth callback detection on web
  },
});
