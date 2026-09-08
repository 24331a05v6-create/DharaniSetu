import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { apiSuccess, apiError } from '../lib/response';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const parcelId = searchParams.get('parcel_id');
    const status = searchParams.get('status');

    let query = supabase.from('data_sources').select('*').order('name');
    if (status) query = query.eq('data_status', status);

    const { data: sources, error } = await query;
    if (error) throw error;

    let stats = null;
    if (parcelId) {
      const { data: parcel } = await supabase.from('parcels').select('source_id, data_status, verification_status').eq('id', parcelId).single();
      stats = parcel;
    }

    return apiSuccess({ sources: sources || [], stats });
  } catch (err) {
    console.error('Data quality API error:', err);
    return apiError('Failed to fetch data quality info', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_id, parcel_id, status, notes } = body;

    if (!source_id || !parcel_id || !status) {
      return apiError('source_id, parcel_id, and status are required');
    }

    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('parcels') as any).update({
      verification_status: status,
      last_verified_at: new Date().toISOString(),
    }).eq('id', parcel_id);

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('audit_logs') as any).insert({
      action: 'data_quality_update',
      entity_type: 'parcel',
      entity_id: parcel_id,
      details: JSON.stringify({ source_id, status, notes }),
    });

    return apiSuccess({ success: true });
  } catch (err) {
    console.error('Data quality update error:', err);
    return apiError('Failed to update data quality', 500);
  }
}
