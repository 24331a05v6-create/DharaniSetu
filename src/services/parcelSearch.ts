import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { Database } from '@/types/database';
import { DEMO_PARCELS } from '@/services/mockData';

type ParcelRow = Database['public']['Tables']['parcels']['Row'];

export interface ParcelSearchResult {
  id: string;
  ulpin: string | null;
  survey_number: string;
  subdivision_number: string | null;
  parcel_reference: string | null;
  area: number;
  area_unit: string;
  land_use: string | null;
  land_classification: string | null;
  data_status: string;
  verification_status: string;
  created_at: string;
  village_name: string;
  mandal_name: string;
  district_name: string;
  state_name: string;
  state_code: string;
}

export interface SearchFilters {
  query?: string;
  searchType?: 'ulpin' | 'survey' | 'reference' | 'location';
  stateId?: string;
  districtId?: string;
  mandalId?: string;
  villageId?: string;
  landUse?: string;
}

export interface LocationOption {
  id: string;
  name: string;
  code?: string;
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
  village:villages!inner(
    id,
    name,
    code,
    mandal:mandals!inner(
      id,
      name,
      code,
      district:districts!inner(
        id,
        name,
        code,
        state:states!inner(
          id,
          name,
          code
        )
      )
    )
  )
`;

function flattenParcelResult(row: Record<string, unknown>): ParcelSearchResult {
  const village = row.village as Record<string, unknown>;
  const mandal = village.mandal as Record<string, unknown>;
  const district = mandal.district as Record<string, unknown>;
  const state = district.state as Record<string, unknown>;

  return {
    id: row.id as string,
    ulpin: row.ulpin as string | null,
    survey_number: row.survey_number as string,
    subdivision_number: row.subdivision_number as string | null,
    parcel_reference: row.parcel_reference as string | null,
    area: row.area as number,
    area_unit: row.area_unit as string,
    land_use: row.land_use as string | null,
    land_classification: row.land_classification as string | null,
    data_status: row.data_status as string,
    verification_status: row.verification_status as string,
    created_at: row.created_at as string,
    village_name: village.name as string,
    mandal_name: mandal.name as string,
    district_name: district.name as string,
    state_name: state.name as string,
    state_code: state.code as string,
  };
}

function demoToSearchResult(parcel: typeof DEMO_PARCELS[0]): ParcelSearchResult {
  return {
    id: parcel.id,
    ulpin: parcel.identity.ulpin,
    survey_number: parcel.identity.surveyNumber,
    subdivision_number: parcel.identity.subDivisionNumber || null,
    parcel_reference: parcel.sourceRecordId || null,
    area: parcel.area,
    area_unit: parcel.areaUnit,
    land_use: parcel.landUse,
    land_classification: parcel.landClassification,
    data_status: parcel.dataQualityStatus,
    verification_status: parcel.dataQualityStatus,
    created_at: parcel.createdAt,
    village_name: parcel.identity.hierarchy.village,
    mandal_name: parcel.identity.hierarchy.mandal,
    district_name: parcel.identity.hierarchy.district,
    state_name: parcel.identity.hierarchy.state,
    state_code: parcel.identity.hierarchy.stateCode,
  };
}

function searchDemoParcels(filters: SearchFilters): ParcelSearchResult[] {
  let results = [...DEMO_PARCELS];

  if (filters.landUse) {
    results = results.filter(p => p.landUse === filters.landUse);
  }

  if (filters.searchType && filters.query) {
    const q = filters.query.trim().toLowerCase();
    if (q) {
      switch (filters.searchType) {
        case 'ulpin':
          results = results.filter(p => p.identity.ulpin.toLowerCase().includes(q));
          break;
        case 'survey':
          results = results.filter(p => p.identity.surveyNumber.toLowerCase().includes(q));
          break;
        case 'reference':
          results = results.filter(p => (p.sourceRecordId || '').toLowerCase().includes(q));
          break;
      }
    }
  }

  return results.map(demoToSearchResult);
}

const PAGE_SIZE = 20;

export async function searchParcels(
  filters: SearchFilters,
  page: number = 0
): Promise<{ data: ParcelSearchResult[]; count: number; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // If Supabase is not configured, use demo data
  if (!isSupabaseConfigured()) {
    const demoResults = searchDemoParcels(filters);
    const paged = demoResults.slice(from, to + 1);
    return {
      data: paged,
      count: demoResults.length,
      hasMore: to + 1 < demoResults.length,
    };
  }

  // Supabase path
  let query = getSupabase()
    .from('parcels')
    .select(PARCEL_SELECT, { count: 'exact' });

  // Apply search filters
  if (filters.searchType && filters.query) {
    const q = filters.query.trim();
    if (q) {
      switch (filters.searchType) {
        case 'ulpin':
          query = query.ilike('ulpin', `%${q}%`);
          break;
        case 'survey':
          query = query.ilike('survey_number', `%${q}%`);
          break;
        case 'reference':
          query = query.ilike('parcel_reference', `%${q}%`);
          break;
      }
    }
  }

  // Apply location filters
  if (filters.landUse) {
    query = query.eq('land_use', filters.landUse);
  }
  if (filters.villageId) {
    query = query.eq('village_id', filters.villageId);
  } else if (filters.mandalId) {
    const { data: villageData } = await getSupabase()
      .from('villages')
      .select('id')
      .eq('mandal_id', filters.mandalId);

    if (villageData && villageData.length > 0) {
      const ids = villageData.map((v: { id: string }) => v.id);
      query = query.in('village_id', ids);
    } else {
      return { data: [], count: 0, hasMore: false };
    }
  } else if (filters.districtId) {
    const { data: mandalData } = await getSupabase()
      .from('mandals')
      .select('id')
      .eq('district_id', filters.districtId);

    if (mandalData && mandalData.length > 0) {
      const mandalIds = mandalData.map((m: { id: string }) => m.id);
      const { data: villageData } = await getSupabase()
        .from('villages')
        .select('id')
        .in('mandal_id', mandalIds);

      if (villageData && villageData.length > 0) {
        const ids = villageData.map((v: { id: string }) => v.id);
        query = query.in('village_id', ids);
      } else {
        return { data: [], count: 0, hasMore: false };
      }
    } else {
      return { data: [], count: 0, hasMore: false };
    }
  } else if (filters.stateId) {
    const { data: districtData } = await getSupabase()
      .from('districts')
      .select('id')
      .eq('state_id', filters.stateId);

    if (districtData && districtData.length > 0) {
      const distIds = districtData.map((d: { id: string }) => d.id);
      const { data: mandalData } = await getSupabase()
        .from('mandals')
        .select('id')
        .in('district_id', distIds);

      if (mandalData && mandalData.length > 0) {
        const mandalIds = mandalData.map((m: { id: string }) => m.id);
        const { data: villageData } = await getSupabase()
          .from('villages')
          .select('id')
          .in('mandal_id', mandalIds);

        if (villageData && villageData.length > 0) {
          const ids = villageData.map((v: { id: string }) => v.id);
          query = query.in('village_id', ids);
        } else {
          return { data: [], count: 0, hasMore: false };
        }
      } else {
        return { data: [], count: 0, hasMore: false };
      }
    } else {
      return { data: [], count: 0, hasMore: false };
    }
  }

  // Apply ordering and pagination
  query = query
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[DharaniSetu] Parcel search error:', error.message, error.details || '');
    throw new Error(`Database error: ${error.message}`);
  }

  const results = (data || []).map(flattenParcelResult);
  const total = count || 0;

  return {
    data: results,
    count: total,
    hasMore: to + 1 < total,
  };
}

export async function getStates(): Promise<LocationOption[]> {
  if (!isSupabaseConfigured()) {
    return [{ id: 'ap-state', name: 'Andhra Pradesh', code: 'AP' }];
  }

  const { data, error } = await getSupabase()
    .from('states')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getDistricts(stateId: string): Promise<LocationOption[]> {
  if (!isSupabaseConfigured()) {
    if (stateId === 'ap-state') {
      return [{ id: 'kr-district', name: 'Krishna', code: 'KR' }];
    }
    return [];
  }

  const { data, error } = await getSupabase()
    .from('districts')
    .select('id, name, code')
    .eq('state_id', stateId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getMandals(districtId: string): Promise<LocationOption[]> {
  if (!isSupabaseConfigured()) {
    if (districtId === 'kr-district') {
      return [{ id: 'vr-mandal', name: 'Vijayawada Rural', code: 'VR' }];
    }
    return [];
  }

  const { data, error } = await getSupabase()
    .from('mandals')
    .select('id, name, code')
    .eq('district_id', districtId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getVillages(mandalId: string): Promise<LocationOption[]> {
  if (!isSupabaseConfigured()) {
    if (mandalId === 'vr-mandal') {
      return [{ id: 'gu-village', name: 'Gunadala', code: 'GU' }];
    }
    return [];
  }

  const { data, error } = await getSupabase()
    .from('villages')
    .select('id, name, code')
    .eq('mandal_id', mandalId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}
