import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../../lib/response';
import { createServiceClient } from '@/lib/supabase';
import { getBearerToken, getCaller, isGovernmentRole } from '@/lib/requestAuth';

export const dynamic = 'force-dynamic';

const STATUSES = new Set(['submitted', 'under_review', 'processing', 'resolved', 'rejected']);

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return apiError('Invalid request reference', 400, 'VALIDATION_ERROR');
    // Reference lookup uses the server client: the UUID itself is the capability.
    const svc = createServiceClient();
    const { data: request_, error: reqErr } = await svc
      .from('service_requests').select('*').eq('id', params.id).single();
    if (reqErr || !request_) return apiError('Service request not found', 404, 'NOT_FOUND');

    const reqData = request_ as unknown as Record<string, unknown>;

    const { data: updates } = await svc
      .from('service_request_updates').select('*').eq('request_id', params.id).order('created_at', { ascending: true });

    let parcel = null;
    if (reqData.parcel_id) {
      const { data: p } = await svc
        .from('parcels').select('id, ulpin, survey_number, subdivision_number, area, area_unit, land_use, villages!inner(name, mandals!inner(name, districts!inner(name)))')
        .eq('id', reqData.parcel_id as string).single();
      parcel = p;
    }

    return apiSuccess({ request: reqData, updates: updates || [], parcel });
  } catch (err) {
    return apiError('Failed to fetch service request', 500, 'SERVICE_REQUEST_ERROR');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) return apiError('Invalid request reference', 400, 'VALIDATION_ERROR');

    // Role-protected: only signed-in government users may change status.
    const token = getBearerToken(request);
    const { userId, profile } = await getCaller(token);
    if (!userId || !isGovernmentRole(profile)) {
      return apiError('Only government officers can update request status', 403, 'FORBIDDEN');
    }

    const body = await request.json().catch(() => ({}));
    const { status, notes } = body as Record<string, unknown>;
    if (typeof status !== 'string' || !STATUSES.has(status)) {
      return apiError('Invalid status value', 400, 'VALIDATION_ERROR');
    }
    if (typeof notes === 'string' && notes.length > 2000) {
      return apiError('Notes must be under 2000 characters', 400, 'VALIDATION_ERROR');
    }

    const svc = createServiceClient();
    const { data: current } = await svc.from('service_requests').select('status').eq('id', params.id).single();
    const currentData = current as unknown as { status: string } | null;
    if (!currentData) return apiError('Service request not found', 404, 'NOT_FOUND');

    await svc.from('service_request_updates').insert({
      request_id: params.id,
      old_status: currentData.status,
      new_status: status,
      updated_by_user_id: userId,
      updated_by_email: profile?.email || null,
      updated_by_role: profile?.role || null,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    } as never);

    const updateData: Record<string, unknown> = { status };
    if (status === 'resolved' || status === 'rejected') {
      updateData.resolved_at = new Date().toISOString();
      if (typeof notes === 'string' && notes.trim()) updateData.resolution_notes = notes.trim();
    }

    const { data, error } = await (svc.from('service_requests') as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => {
          select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
        };
      };
    }).update(updateData).eq('id', params.id).select().single();
    if (error) throw new Error(error.message);
    return apiSuccess(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update service request';
    return apiError(msg, 500, 'SERVICE_REQUEST_UPDATE_ERROR');
  }
}
