import { getSupabase } from '@/lib/supabase';

export interface GovernanceAnalytics {
  totalParcels: number;
  verifiedParcels: number;
  pendingReview: number;
  ulpinCoverage: number;
  ulpinCoveragePercent: number;
  dataCompleteness: { complete: number; partial: number; missing: number };
  dataConflicts: number;
  unmatchedRecords: number;
  sourceHealth: Array<{ name: string; total: number; verified: number; pending: number; failed: number }>;
  recentVerifications: Array<{ id: string; ulpin: string | null; action: string; verifier: string; timestamp: string }>;
  recentImports: Array<{ id: string; source: string; count: number; timestamp: string }>;
  changeDetectionAlerts: number;
  landUseDistribution: Array<{ land_use: string; count: number }>;
}

export async function getGovernanceAnalytics(): Promise<GovernanceAnalytics> {
  const supabase = getSupabase();
  
  const [parcelsRes, conflictsRes, sourcesRes, changesRes, landUseRes] = await Promise.all([
    supabase.from('parcels').select('id, ulpin, verification_status, source_id, land_use, data_sources!inner(name)', { count: 'exact' }),
    (supabase.from('data_conflicts') as any).select('id', { count: 'exact' }).eq('status', 'open'),
    supabase.from('data_sources').select('name'),
    (supabase.from('change_detections') as any).select('id', { count: 'exact' }).eq('review_status', 'pending'),
    supabase.from('parcels').select('land_use'),
  ]);

  const parcels = (parcelsRes.data || []) as Array<Record<string, unknown>>;
  const total = parcelsRes.count || 0;
  const verified = parcels.filter(p => p.verification_status === 'verified').length;
  const pending = parcels.filter(p => p.verification_status === 'pending').length;
  const withUlpin = parcels.filter(p => p.ulpin).length;
  const unmatched = parcels.filter(p => !p.ulpin && p.verification_status === 'pending').length;

  const sourceMap = new Map<string, { name: string; total: number; verified: number; pending: number; failed: number }>();
  for (const p of parcels) {
    const src = p.data_sources as Record<string, unknown> | null;
    const key = (src?.name as string) || 'Unknown';
    const existing = sourceMap.get(key) || { name: key, total: 0, verified: 0, pending: 0, failed: 0 };
    existing.total++;
    if (p.verification_status === 'verified') existing.verified++;
    else if (p.verification_status === 'pending') existing.pending++;
    else existing.failed++;
    sourceMap.set(key, existing);
  }

  const luMap = new Map<string, number>();
  for (const p of landUseRes.data || []) {
    const lu = (p as Record<string, unknown>).land_use as string;
    luMap.set(lu, (luMap.get(lu) || 0) + 1);
  }

  return {
    totalParcels: total,
    verifiedParcels: verified,
    pendingReview: pending,
    ulpinCoverage: withUlpin,
    ulpinCoveragePercent: total > 0 ? Math.round((withUlpin / total) * 100) : 0,
    dataCompleteness: { complete: verified, partial: pending, missing: total - verified - pending },
    dataConflicts: conflictsRes.count || 0,
    unmatchedRecords: unmatched,
    sourceHealth: Array.from(sourceMap.values()),
    recentVerifications: [],
    recentImports: [],
    changeDetectionAlerts: changesRes.count || 0,
    landUseDistribution: Array.from(luMap.entries()).map(([land_use, count]) => ({ land_use, count })),
  };
}

export interface AreaAnalytics {
  level: 'state' | 'district' | 'mandal' | 'village';
  id: string;
  name: string;
  parcelCount: number;
  verifiedCount: number;
  verifiedPercent: number;
  ulpinCount: number;
  ulpinPercent: number;
  landUseDistribution: Array<{ land_use: string; count: number }>;
  pendingReview: number;
  conflicts: number;
  children?: Array<{ id: string; name: string; parcelCount: number; verifiedPercent: number }>;
}

export async function getAreaAnalytics(level: string, parentId?: string): Promise<AreaAnalytics[]> {
  const supabase = getSupabase();
  let query: any;

  if (level === 'state') {
    query = supabase.from('states').select('id, name, parcels:parcels(id, verification_status, ulpin, land_use)');
  } else if (level === 'district') {
    query = supabase.from('districts').select('id, name, state_id, parcels:parcels(id, verification_status, ulpin, land_use)');
    if (parentId) query = query.eq('state_id', parentId);
  } else if (level === 'mandal') {
    query = supabase.from('mandals').select('id, name, district_id, parcels:parcels(id, verification_status, ulpin, land_use)');
    if (parentId) query = query.eq('district_id', parentId);
  } else if (level === 'village') {
    query = supabase.from('villages').select('id, name, mandal_id, ward, parcels:parcels(id, verification_status, ulpin, land_use)');
    if (parentId) query = query.eq('mandal_id', parentId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).map(row => {
    const parcelsList = (row.parcels || []) as Array<Record<string, unknown>>;
    const parcelCount = parcelsList.length;
    const verifiedCount = parcelsList.filter(p => p.verification_status === 'verified').length;
    const ulpinCount = parcelsList.filter(p => p.ulpin).length;
    const pendingCount = parcelsList.filter(p => p.verification_status === 'pending').length;

    const luMap = new Map<string, number>();
    for (const p of parcelsList) {
      const lu = p.land_use as string;
      luMap.set(lu, (luMap.get(lu) || 0) + 1);
    }

    return {
      level: level as AreaAnalytics['level'],
      id: row.id as string,
      name: row.name as string,
      parcelCount,
      verifiedCount,
      verifiedPercent: parcelCount > 0 ? Math.round((verifiedCount / parcelCount) * 100) : 0,
      ulpinCount,
      ulpinPercent: parcelCount > 0 ? Math.round((ulpinCount / parcelCount) * 100) : 0,
      landUseDistribution: Array.from(luMap.entries()).map(([land_use, count]) => ({ land_use, count })),
      pendingReview: pendingCount,
      conflicts: 0,
    };
  });
}
