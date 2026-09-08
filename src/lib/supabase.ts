import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

let supabaseInstance: SupabaseClient<Database> | null = null;

let _envMissing = false;

export function getPublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getPublicKey();
  return !!(url && key && url !== 'your_supabase_project_url' && key !== 'your_supabase_anon_key' && url !== 'https://placeholder.supabase.co');
}

export function getSupabase(): SupabaseClient<Database> {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = getPublicKey();

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_project_url' || supabaseAnonKey === 'your_supabase_anon_key') {
    if (!_envMissing) {
      _envMissing = true;
      console.error(
        '[DharaniSetu] Supabase credentials not configured.\n' +
        'Create .env.local with:\n' +
        '  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
        '  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key (or NEXT_PUBLIC_SUPABASE_ANON_KEY)\n' +
        'Using demo data fallback.'
      );
    }
    supabaseInstance = createClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder'
    );
    return supabaseInstance;
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);

  return supabaseInstance;
}

export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations');
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL || '', serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
