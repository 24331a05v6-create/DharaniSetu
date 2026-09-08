import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiSuccess, apiError } from '../../lib/response';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return apiError('Email and password are required');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return apiError(error.message, 401);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return apiSuccess({
      session: data.session,
      user: data.user,
      profile: profile || null,
    });
  } catch (err) {
    console.error('Login error:', err);
    return apiError('Login failed', 500);
  }
}
