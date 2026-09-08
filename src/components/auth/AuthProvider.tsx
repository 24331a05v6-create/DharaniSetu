'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { UserProfile, AppRole } from '@/lib/auth';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...roles: AppRole[]) => boolean;
  isGovernmentUser: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, loading: true,
  signIn: async () => {}, signOut: async () => {},
  hasRole: () => false, isGovernmentUser: false,
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      setProfile(data as UserProfile | null);
    } catch { setProfile(null); }
    finally { setLoading(false); }
  }

  async function signIn(email: string, password: string) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null);
  }

  function hasRole(...roles: AppRole[]): boolean {
    if (!profile || !profile.is_active) return false;
    return roles.includes(profile.role);
  }

  const isGovernmentUser = profile !== null && profile.is_active && profile.role !== 'citizen';

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut, hasRole, isGovernmentUser }}>
      {children}
    </AuthContext.Provider>
  );
}
