import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://jfbbrlekjmvoprswqzoc.supabase.co"
const supabasePublishableKey = "sb_publishable_n6I0jso31I6gt3P2z0KqzQ_4Ld2L8DU"

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})