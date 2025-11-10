import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Move these to environment variables
const SUPABASE_URL = "https://jfbbrlekjmvoprswqzoc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_n6I0jso31I6gt3P2z0KqzQ_4Ld2L8DU";

/**
 * Supabase client instance
 * Configured with AsyncStorage for session persistence
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
