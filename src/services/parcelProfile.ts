import { getSupabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type ParcelRow = Database['public']['Tables']['parcels']['Row'];
type VillageRow = Database['public']['Tables']['villages']['Row'];
type MandalRow = Database['public']['Tables']['mandals']['Row'];
type DistrictRow = Database['public']['Tables']['districts']['Row'];
type StateRow = Database['public']['Tables']['states']['Row'];

export interface FullParcelProfile {
  id: string;
  ulpin: string | null;
  survey_number: string;
  subdivision_number: string | null;
  parcel_reference: string | null;
  area: number;
  area_unit: string;
  land_use: string;
  land_classification: string | null;
  data_status: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
  village: { id: string; name: string; code: string; ward: string | null; local_body: string | null };
  mandal: { id: string; name: string; code: string };
  district: { id: string; name: string; code: string };
  state: { id: string; name: string; code: string };
  source: { id: string; name: string; department: string; source_type: string } | null;
  geometry: unknown;
  centroid: unknown;
}

export interface RelatedRecord {
  id: string;
  [key: string]: unknown;
}

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

function mapRow(row: Record<string, unknown>): FullParcelProfile {
  const village = row.village as Record<string, unknown>;
  const mandal = (village.mandal as Record<string, unknown>);
  const district = (mandal.district as Record<string, unknown>);
  const state = (district.state as Record<string, unknown>);
  const source = row.source as Record<string, unknown> | null;

  return {
    id: row.id as string,
    ulpin: row.ulpin as string | null,
    survey_number: row.survey_number as string,
    subdivision_number: row.subdivision_number as string | null,
    parcel_reference: row.parcel_reference as string | null,
    area: row.area as number,
    area_unit: row.area_unit as string,
    land_use: row.land_use as string,
    land_classification: row.land_classification as string | null,
    data_status: row.data_status as string,
    verification_status: row.verification_status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    village: { id: village.id as string, name: village.name as string, code: village.code as string, ward: village.ward as string | null, local_body: village.local_body as string | null },
    mandal: { id: mandal.id as string, name: mandal.name as string, code: mandal.code as string },
    district: { id: district.id as string, name: district.name as string, code: district.code as string },
    state: { id: state.id as string, name: state.name as string, code: state.code as string },
    source: source ? { id: source.id as string, name: source.name as string, department: source.department as string, source_type: source.source_type as string } : null,
    geometry: row.geometry,
    centroid: row.centroid,
  };
}

export async function getParcelByUlpin(ulpin: string): Promise<FullParcelProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('parcels')
    .select(PARCEL_SELECT)
    .eq('ulpin', ulpin)
    .single();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getParcelById(id: string): Promise<FullParcelProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('parcels')
    .select(PARCEL_SELECT)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getParcelBySurveyNumber(surveyNumber: string, villageId?: string): Promise<FullParcelProfile | null> {
  const supabase = getSupabase();
  let query = supabase
    .from('parcels')
    .select(PARCEL_SELECT)
    .eq('survey_number', surveyNumber);
  if (villageId) query = query.eq('village_id', villageId);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getRightsByParcelId(parcelId: string): Promise<RelatedRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('rights_records')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as RelatedRecord[];
}

export async function getRegistrationsByParcelId(parcelId: string): Promise<RelatedRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('registration_records')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('registration_date', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as RelatedRecord[];
}

export async function getEncumbrancesByParcelId(parcelId: string): Promise<RelatedRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('encumbrances')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as RelatedRecord[];
}

export async function getPlanningByParcelId(parcelId: string): Promise<RelatedRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('planning_records')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false })
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as RelatedRecord;
}

export async function getBuildingPermissionsByParcelId(parcelId: string): Promise<RelatedRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('building_permissions')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as RelatedRecord[];
}

export async function getTaxByParcelId(parcelId: string): Promise<RelatedRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('property_tax_records')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('assessment_year', { ascending: false })
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as RelatedRecord;
}

export async function getUtilitiesByParcelId(parcelId: string): Promise<RelatedRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('utility_records')
    .select('*')
    .eq('parcel_id', parcelId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as RelatedRecord;
}

export async function getRestrictionsByParcelId(parcelId: string): Promise<RelatedRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('restrictions')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as RelatedRecord[];
}

export async function getDocumentsByParcelId(parcelId: string): Promise<RelatedRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('parcel_documents')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as RelatedRecord[];
}

export async function getHistoryByParcelId(parcelId: string): Promise<RelatedRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('parcel_history')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('event_date', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as RelatedRecord[];
}
