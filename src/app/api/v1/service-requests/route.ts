import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { getSupabase, createServiceClient } from '@/lib/supabase';
import { getBearerToken, getCaller, authedClient } from '@/lib/requestAuth';

export const dynamic = 'force-dynamic';

const SERVICE_TYPES = new Set([
  'record_information', 'mutation_status', 'registration_status',
  'planning_information', 'property_tax', 'general_enquiry',
  'encumbrance_certificate', 'document_copy', 'other',
]);

const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET(request: NextRequest) {
  try {
    // Request list requires a signed-in caller; RLS scopes rows to that caller.
    const token = getBearerToken(request);
    if (!token) return apiError('Sign in to view service requests', 401, 'UNAUTHENTICATED');
    const { userId } = await getCaller(token);
    if (!userId) return apiError('Invalid or expired session', 401, 'UNAUTHENTICATED');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userIdFilter = searchParams.get('user_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const supabase = authedClient(token);
    let query = supabase.from('service_requests').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status as never);
    if (userIdFilter) query = query.eq('citizen_user_id', userIdFilter as never);
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return apiSuccess({ requests: data || [], total: count || 0, limit, offset });
  } catch (err) {
    return apiError('Failed to fetch service requests', 500, 'SERVICE_REQUESTS_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { parcel_id, service_type, description, priority } = body as Record<string, unknown>;
    let { citizen_email } = body as Record<string, unknown>;

    // Optional caller identity (attaches the request to a signed-in citizen).
    const token = getBearerToken(request);
    const { userId } = await getCaller(token);

    // --- Server-side validation ---
    if (typeof service_type !== 'string' || !SERVICE_TYPES.has(service_type)) {
      return apiError('Select a valid service type', 400, 'VALIDATION_ERROR');
    }
    if (typeof citizen_email !== 'string' || !EMAIL_RE.test(citizen_email.trim())) {
      if (userId) {
        try {
          const svc = createServiceClient();
          const { data: u } = await svc.auth.admin.getUserById(userId);
          citizen_email = u?.user?.email || '';
        } catch { /* fall through to validation error */ }
      }
      if (typeof citizen_email !== 'string' || !EMAIL_RE.test((citizen_email as string).trim())) {
        return apiError('A valid email address is required', 400, 'VALIDATION_ERROR');
      }
    }
    const email = (citizen_email as string).trim().toLowerCase();
    if (typeof description === 'string' && description.length > 2000) {
      return apiError('Description must be under 2000 characters', 400, 'VALIDATION_ERROR');
    }
    const prio = typeof priority === 'string' && PRIORITIES.has(priority) ? priority : 'normal';

    // Server-side: verify the parcel exists when one is linked.
    const svc = createServiceClient();
    let parcelId: string | null = null;
    if (typeof parcel_id === 'string' && parcel_id) {
      const { data: parcel } = await svc.from('parcels').select('id').eq('id', parcel_id).single();
      if (!parcel) return apiError('Selected parcel does not exist', 400, 'VALIDATION_ERROR');
      parcelId = parcel_id;
    }

    const insertRes = await svc.from('service_requests').insert({
      parcel_id: parcelId,
      citizen_user_id: userId || null,
      citizen_email: email,
      service_type: service_type as never,
      description: (typeof description === 'string' && description.trim() ? description.trim() : null) as never,
      priority: prio as never,
      status: 'submitted',
    } as never).select().single() as unknown as { data: Record<string, unknown> | null; error: { message: string } | null };
    if (insertRes.error || !insertRes.data) {
      throw new Error(insertRes.error?.message || 'Insert failed');
    }

    // Honest initial timeline entry: submitted.
    await svc.from('service_request_updates').insert({
      request_id: (insertRes.data as { id: string }).id,
      old_status: null,
      new_status: 'submitted',
      updated_by_user_id: userId || null,
      updated_by_email: email,
      updated_by_role: 'citizen',
      notes: 'Request submitted',
    } as never);

    return apiSuccess(insertRes.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create service request';
    return apiError(msg, 500, 'SERVICE_REQUEST_CREATE_ERROR');
  }
}
