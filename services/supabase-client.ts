import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Verify that a valid URL and key are provided
export const isSupabaseConfigured = 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey.trim().length > 0;

// Use placeholder credentials if not configured to prevent startup crashes
const finalUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-melo.supabase.co';
const finalKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key-melo';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
