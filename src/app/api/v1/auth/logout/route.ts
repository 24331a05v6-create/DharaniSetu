import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiSuccess, apiError } from '../../lib/response';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return apiError('Authorization header required', 401);

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { error } = await supabase.auth.signOut();
    if (error) return apiError(error.message, 500);

    return apiSuccess({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return apiError('Logout failed', 500);
  }
}
