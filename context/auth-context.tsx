import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/services/supabase-client';
import { dbService, DbUser } from '@/services/db';

interface AuthContextType {
  user: DbUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isMock: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and load session
  useEffect(() => {
    async function initAuth() {
      try {
        if (isSupabaseConfigured) {
          // Listen to Supabase Auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (session?.user) {
                const dbUser = await dbService.getCurrentUser();
                setUser(dbUser);
              } else {
                setUser(null);
              }
              setLoading(false);
            }
          );

          // Get initial user
          const dbUser = await dbService.getCurrentUser();
          setUser(dbUser);
          setLoading(false);

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // Load mock user from storage
          const mockUser = await dbService.getCurrentUser();
          setUser(mockUser);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // Sign In Action
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      setLoading(true);
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error: error.message };
        const dbUser = await dbService.getCurrentUser();
        setUser(dbUser);
        return { error: null };
      } else {
        // Authenticate via Neon Postgres Express API
        try {
          const name = email.split('@')[0];
          const dbUser = await dbService.loginGuest(name, email);
          setUser(dbUser);
          return { error: null };
        } catch (err: any) {
          return { error: err.message || 'Failed to authenticate via server' };
        }
      }
    } catch (err: any) {
      return { error: err.message || 'An unknown error occurred during sign-in' };
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Action
  const signUp = async (name: string, email: string, password: string): Promise<{ error: string | null }> => {
    try {
      setLoading(true);
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });
        if (error) return { error: error.message };
        
        // Supabase trigger automatically inserts public.users, 
        // but it might take a split second, so handle user retrieval gracefully.
        return { error: null };
      } else {
        // Register and login via Neon Postgres Express API
        try {
          const dbUser = await dbService.loginGuest(name, email);
          setUser(dbUser);
          return { error: null };
        } catch (err: any) {
          return { error: err.message || 'Failed to register via server' };
        }
      }
    } catch (err: any) {
      return { error: err.message || 'An unknown error occurred during sign-up' };
    } finally {
      setLoading(false);
    }
  };

  // Sign Out Action
  const signOut = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      await AsyncStorage.removeItem('mock_current_user');
    }
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, isMock: !isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
