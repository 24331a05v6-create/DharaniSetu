import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { apiSuccess, apiError } from '../../lib/response';

const PARCEL_SELECT = `
  id,
  ulpin,
  survey_number,
  subdivision_number,
  parcel_reference,
  area,
  area_unit,
  land_use,
  land_classification,
  data_status,
  verification_status,
  created_at,
  updated_at,
  geometry,
  centroid,
  village:villages!inner(
    id, name, code, ward, local_body,
    mandal:mandals!inner(
      id, name, code,
      district:districts!inner(
        id, name, code,
        state:states!inner(
          id, name, code
        )
      )
    )
  ),
  source:data_sources(
    id, name, department, source_type
  )
`;

function mapParcel(row: Record<string, unknown>) {
  const village = row.village as Record<string, unknown>;
  const mandal = village.mandal as Record<string, unknown>;
  const district = mandal.district as Record<string, unknown>;
  const state = district.state as Record<string, unknown>;
  const source = row.source as Record<string, unknown> | null;
  return {
    id: row.id,
    ulpin: row.ulpin,
    survey_number: row.survey_number,
    subdivision_number: row.subdivision_number,
    parcel_reference: row.parcel_reference,
    area: row.area,
    area_unit: row.area_unit,
    land_use: row.land_use,
    land_classification: row.land_classification,
    data_status: row.data_status,
    verification_status: row.verification_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    geometry: row.geometry,
    centroid: row.centroid,
    village: { id: village.id, name: village.name, code: village.code, ward: village.ward, local_body: village.local_body },
    mandal: { id: mandal.id, name: mandal.name, code: mandal.code },
    district: { id: district.id, name: district.name, code: district.code },
    state: { id: state.id, name: state.name, code: state.code },
    source: source ? { id: source.id, name: source.name, department: source.department, source_type: source.source_type } : null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const { id } = params;

    let query = supabase.from('parcels').select(PARCEL_SELECT);

    if (id.startsWith('AP-') || /^[A-Z]{2}-/.test(id)) {
      query = query.eq('ulpin', id);
    } else {
      query = query.eq('id', id);
    }

    const { data, error } = await query.single();
    if (error || !data) {
      return apiError('Parcel not found', 404);
    }

    return apiSuccess(mapParcel(data as Record<string, unknown>));
  } catch (err) {
    console.error('Parcel API error:', err);
    return apiError('Failed to fetch parcel', 500);
  }
}
