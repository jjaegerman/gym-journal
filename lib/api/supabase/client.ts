import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const RAW_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://jfbbrlekjmvoprswqzoc.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_n6I0jso31I6gt3P2z0KqzQ_4Ld2L8DU";

// On native, rewrite localhost/127.0.0.1 to the Metro host so the emulator
// and physical devices via Expo Go can reach the dev machine's Supabase.
function resolveSupabaseUrl(url: string): string {
  if (Platform.OS === 'web') return url;
  const parsed = new URL(url);
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return url;
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // @ts-ignore — present in classic Expo Go runtimes
    Constants.expoGoConfig?.debuggerHost;
  const metroHost = hostUri?.split(':')[0];
  if (metroHost) {
    parsed.hostname = metroHost;
    return parsed.toString();
  }
  if (Platform.OS === 'android') {
    parsed.hostname = '10.0.2.2';
    return parsed.toString();
  }
  return url;
}

const SUPABASE_URL = resolveSupabaseUrl(RAW_SUPABASE_URL);

/**
 * Supabase client instance
 * Configured with platform-specific storage for session persistence
 * - Web: Uses localStorage and detects OAuth callbacks in URL
 * - Native: Uses AsyncStorage
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage, // Use default localStorage on web
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable OAuth callback detection on web
  },
});
