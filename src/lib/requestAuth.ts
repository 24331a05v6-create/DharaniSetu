import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase';
import { Database } from '@/types/database';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function authedClient(token: string) {
  return createClient<Database>(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export interface CallerProfile {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export async function getCaller(token: string | null): Promise<{ userId: string; profile: CallerProfile | null }> {
  if (!token) return { userId: '', profile: null };
  try {
    const svc = createServiceClient();
    const { data } = await svc.auth.getUser(token);
    const userId = data?.user?.id || '';
    if (!userId) return { userId: '', profile: null };
    const { data: prof } = await svc
      .from('user_profiles')
      .select('id, email, role, is_active')
      .eq('id', userId)
      .single();
    return { userId, profile: (prof as unknown as CallerProfile) || null };
  } catch {
    return { userId: '', profile: null };
  }
}

const GOV_ROLES = new Set(['revenue_officer', 'registration_officer', 'planning_officer', 'municipal_officer', 'administrator']);

export function isGovernmentRole(profile: CallerProfile | null): boolean {
  return !!profile && profile.is_active && GOV_ROLES.has(profile.role);
}
