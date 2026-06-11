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
        // Mock authentication
        const normalizedEmail = email.toLowerCase().trim();
        const mockUsersStr = await AsyncStorage.getItem('mock_registered_users');
        const mockUsers: Array<DbUser & { password_hash: string }> = mockUsersStr 
          ? JSON.parse(mockUsersStr) 
          : [];
        
        const matchedUser = mockUsers.find(u => u.email === normalizedEmail);
        
        if (!matchedUser) {
          return { error: 'Invalid email or password.' };
        }
        
        if (matchedUser.password_hash !== password) { // Simple password matching for mock
          return { error: 'Invalid email or password.' };
        }

        const loggedInUser: DbUser = {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
          role: matchedUser.role || 'user',
          created_at: matchedUser.created_at
        };

        await AsyncStorage.setItem('mock_current_user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        return { error: null };
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
        // Mock register
        const normalizedEmail = email.toLowerCase().trim();
        const mockUsersStr = await AsyncStorage.getItem('mock_registered_users');
        const mockUsers: Array<DbUser & { password_hash: string }> = mockUsersStr 
          ? JSON.parse(mockUsersStr) 
          : [];

        if (mockUsers.some(u => u.email === normalizedEmail)) {
          return { error: 'Email already in use.' };
        }

        const newUserId = Math.random().toString(36).substr(2, 9);
        const newMockUser = {
          id: newUserId,
          name,
          email: normalizedEmail,
          password_hash: password,
          role: 'user' as const,
          created_at: new Date().toISOString()
        };

        mockUsers.push(newMockUser);
        await AsyncStorage.setItem('mock_registered_users', JSON.stringify(mockUsers));

        const loggedInUser: DbUser = {
          id: newMockUser.id,
          name: newMockUser.name,
          email: newMockUser.email,
          role: newMockUser.role,
          created_at: newMockUser.created_at
        };

        await AsyncStorage.setItem('mock_current_user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        return { error: null };
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
