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

// Safe Storage wrapper for SSR (Node.js) environments
const isServer = typeof window === 'undefined';

const safeStorage = {
  getItem: async (key: string) => {
    if (isServer) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (isServer) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    if (isServer) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  }
};

const clientOptions: any = {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
};

// If we are bundling/pre-rendering in Node.js and WebSocket is missing, define a dummy WebSocket class
if (isServer && !global.WebSocket) {
  class DummyWebSocket {
    constructor() {}
    send() {}
    close() {}
  }
  global.WebSocket = DummyWebSocket as any;
}

export const supabase = createClient(finalUrl, finalKey, clientOptions);
