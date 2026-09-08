import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    if (!userId) return apiError('user_id required', 400, 'VALIDATION_ERROR');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    const unreadCount = (data || []).filter((n: Record<string, unknown>) => !n.is_read).length;
    return apiSuccess({ notifications: data || [], unreadCount });
  } catch (err) {
    return apiError('Failed to fetch notifications', 500, 'NOTIFICATIONS_ERROR');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user_id, markAll } = body;
    const supabase = getSupabase();

    if (markAll && user_id) {
      await (supabase.from('notifications') as any).update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user_id).eq('is_read', false);
    } else if (id) {
      await (supabase.from('notifications') as any).update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    }
    return apiSuccess({ success: true });
  } catch (err) {
    return apiError('Failed to update notifications', 500, 'NOTIFICATION_UPDATE_ERROR');
  }
}
