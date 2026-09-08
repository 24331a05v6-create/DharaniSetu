import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export type AppRole = 'citizen' | 'revenue_officer' | 'registration_officer' | 'planning_officer' | 'municipal_officer' | 'administrator';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  department: string | null;
  state_code: string | null;
  is_active: boolean;
}

let browserAuthInstance: SupabaseClient<Database> | null = null;

export function getBrowserAuth(): SupabaseClient<Database> {
  if (browserAuthInstance) return browserAuthInstance;
  browserAuthInstance = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  return browserAuthInstance;
}

export async function signIn(email: string, password: string) {
  const supabase = getBrowserAuth();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getBrowserAuth();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getBrowserAuth();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getBrowserAuth();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as UserProfile;
}

export function hasRole(userProfile: UserProfile | null, ...roles: AppRole[]): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  return roles.includes(userProfile.role);
}

export function isGovernmentUser(userProfile: UserProfile | null): boolean {
  if (!userProfile || !userProfile.is_active) return false;
  return userProfile.role !== 'citizen';
}

export function canAccessGovernmentDashboard(userProfile: UserProfile | null): boolean {
  return isGovernmentUser(userProfile);
}

export const ROLE_LABELS: Record<AppRole, string> = {
  citizen: 'Citizen',
  revenue_officer: 'Revenue Officer',
  registration_officer: 'Registration Officer',
  planning_officer: 'Planning Officer',
  municipal_officer: 'Municipal Officer',
  administrator: 'Administrator',
};

export const ROLE_DEPARTMENTS: Partial<Record<AppRole, string>> = {
  revenue_officer: 'Revenue & Land Records',
  registration_officer: 'Registration & Stamps',
  planning_officer: 'Town Planning',
  municipal_officer: 'Municipal Corporation',
  administrator: 'System Administration',
};
