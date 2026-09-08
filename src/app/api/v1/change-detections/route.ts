import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const parcelId = searchParams.get('parcel_id');
    const reviewStatus = searchParams.get('review_status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase.from('change_detections').select('*, parcels!inner(id, ulpin, survey_number)');
    if (parcelId) query = query.eq('parcel_id', parcelId);
    if (reviewStatus) query = query.eq('review_status', reviewStatus);
    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return apiSuccess({ changes: data || [] });
  } catch (err) {
    return apiError('Failed to fetch change detections', 500, 'CHANGE_DETECTIONS_ERROR');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, review_status, reviewer_id, reviewer_email, review_notes } = body;
    if (!id || !review_status) return apiError('id and review_status required', 400, 'VALIDATION_ERROR');

    const supabase = getSupabase();
    const { data, error } = await (supabase
      .from('change_detections') as any)
      .update({
        review_status,
        reviewer_id: reviewer_id || null,
        reviewer_email: reviewer_email || null,
        review_notes: review_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return apiSuccess(data);
  } catch (err) {
    return apiError('Failed to update change detection', 500, 'CHANGE_DETECTION_UPDATE_ERROR');
  }
}
