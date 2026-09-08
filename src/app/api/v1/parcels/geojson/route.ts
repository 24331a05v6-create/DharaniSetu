import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { apiSuccess, apiError } from '../../lib/response';

const PARCEL_SELECT = `
  id,
  ulpin,
  survey_number,
  subdivision_number,
  area,
  area_unit,
  land_use,
  data_status,
  verification_status,
  geometry,
  village:villages!inner(
    name,
    mandal:mandals!inner(
      name,
      district:districts!inner(
        name
      )
    )
  )
`;

interface GeoJSONFeature {
  type: 'Feature';
  id: string;
  properties: {
    id: string;
    ulpin: string | null;
    survey_number: string;
    subdivision_number: string | null;
    area: number;
    area_unit: string;
    land_use: string;
    data_status: string;
    verification_status: string;
    village: string;
    mandal: string;
    district: string;
  };
  geometry: unknown;
}

function mapFeature(row: Record<string, unknown>): GeoJSONFeature {
  const village = row.village as Record<string, unknown>;
  const mandal = village.mandal as Record<string, unknown>;
  const district = mandal.district as Record<string, unknown>;
  return {
    type: 'Feature',
    id: row.id as string,
    properties: {
      id: row.id as string,
      ulpin: row.ulpin as string | null,
      survey_number: row.survey_number as string,
      subdivision_number: row.subdivision_number as string | null,
      area: row.area as number,
      area_unit: row.area_unit as string,
      land_use: row.land_use as string,
      data_status: row.data_status as string,
      verification_status: row.verification_status as string,
      village: village.name as string,
      mandal: mandal.name as string,
      district: district.name as string,
    },
    geometry: row.geometry,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const bbox = searchParams.get('bbox');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const stateCode = searchParams.get('state');
    const districtName = searchParams.get('district');

    let query = supabase
      .from('parcels')
      .select(PARCEL_SELECT, { count: 'exact' });

    if (bbox) {
      const [west, south, east, north] = bbox.split(',').map(Number);
      if ([west, south, east, north].every(n => !isNaN(n))) {
        // PostgREST cannot filter on st_intersects; use the spatial RPC.
        const rpc = supabase.rpc as unknown as (
          fn: string,
          args: Record<string, number>
        ) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
        const { data: rpcData, error: rpcError } = await rpc('parcels_in_bbox', {
          w: west, s: south, e: east, n: north, max_rows: limit,
        });
        if (rpcError) throw new Error(rpcError.message);
        // RPC returns flat parcel rows; resolve hierarchy names for properties.
        const villageIds = [...new Set((rpcData || []).map(r => r.village_id as string).filter(Boolean))];
        const vById: Record<string, { name: string; mandal: { name: string; district: { name: string } } }> = {};
        if (villageIds.length > 0) {
          const { data: vData } = await supabase
            .from('villages')
            .select('id, name, mandal:mandals!inner(name, district:districts!inner(name))')
            .in('id', villageIds);
          for (const v of (vData || []) as unknown as Array<{
            id: string; name: string; mandal: { name: string; district: { name: string } };
          }>) {
            vById[v.id] = { name: v.name, mandal: v.mandal };
          }
        }
        const emptyLoc = { name: '', mandal: { name: '', district: { name: '' } } };
        const features: GeoJSONFeature[] = (rpcData || []).map((row) =>
          mapFeature({ ...row, village: vById[row.village_id as string] || emptyLoc })
        );
        return apiSuccess({
          type: 'FeatureCollection' as const,
          features,
          meta: { total: features.length, returned: features.length, offset, limit },
        });
      }
    }

    if (stateCode) {
      const { data: states } = await supabase.from('states').select('id').eq('code', stateCode).single() as { data: { id: string } | null };
      if (states) query = query.eq('state_id', states.id);
    }

    if (districtName) {
      const { data: districts } = await supabase.from('districts').select('id').ilike('name', districtName) as { data: { id: string }[] | null };
      if (districts && districts.length > 0) {
        query = query.in('district_id', districts.map(d => d.id));
      }
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const features: GeoJSONFeature[] = (data || []).map(mapFeature);

    const geojson = {
      type: 'FeatureCollection' as const,
      features,
      meta: {
        total: count || 0,
        returned: features.length,
        offset,
        limit,
      },
    };

    return apiSuccess(geojson);
  } catch (err) {
    console.error('GeoJSON API error:', err);
    return apiError('Failed to fetch parcel GeoJSON data', 500);
  }
}
