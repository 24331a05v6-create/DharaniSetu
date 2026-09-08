import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { apiSuccess, apiError } from '../lib/response';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ logs: data || [], total: (data || []).length });
  } catch (err) {
    console.error('Audit logs API error:', err);
    return apiError('Failed to fetch audit logs', 500);
  }
}
