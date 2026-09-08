import { getSupabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = getSupabase();
  const { data, error } = await (supabase
    .from('notifications') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return (data || []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = getSupabase();
  const { count } = await (supabase
    .from('notifications') as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  return count || 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = getSupabase();
  await (supabase
    .from('notifications') as any)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = getSupabase();
  await (supabase
    .from('notifications') as any)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export async function createNotification(data: {
  userId: string;
  type: Notification['notification_type'];
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const supabase = getSupabase();
  await (supabase.from('notifications') as any).insert({
    user_id: data.userId,
    notification_type: data.type,
    title: data.title,
    message: data.message,
    entity_type: data.entityType || null,
    entity_id: data.entityId || null,
  });
}
