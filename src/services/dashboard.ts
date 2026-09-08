import { getSupabase } from '@/lib/supabase';

export interface DashboardStats {
  totalParcels: number;
  verifiedParcels: number;
  pendingReview: number;
  unverifiedParcels: number;
  rejectedParcels: number;
  parcelsWithUlpin: number;
  parcelsWithoutUlpin: number;
  totalRightsRecords: number;
  totalRegistrations: number;
  totalEncumbrances: number;
  totalPlanningRecords: number;
  totalBuildingPermissions: number;
  totalTaxRecords: number;
  totalUtilities: number;
  totalRestrictions: number;
  totalDocuments: number;
  totalHistory: number;
  byLandUse: Array<{ land_use: string; count: number }>;
  byDistrict: Array<{ name: string; count: number }>;
  openConflicts: number;
  verificationPercentage: number;
  sourceCounts: Array<{ name: string; count: number; source_type: string }>;
  recentVerifications: Array<{
    id: string;
    parcelId: string;
    ulpin: string | null;
    surveyNumber: string;
    action: string;
    verifier: string;
    timestamp: string;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabase();

  const [parcelsRes, rightsRes, regsRes, encRes, planRes, buildRes, taxRes, utilRes, restRes, docsRes, histRes, logsRes] = await Promise.all([
    supabase.from('parcels').select('id, ulpin, verification_status, land_use, source_id, district:districts!inner(name), data_sources!inner(name, source_type)', { count: 'exact' }),
    supabase.from('rights_records').select('id', { count: 'exact' }),
    supabase.from('registration_records').select('id', { count: 'exact' }),
    supabase.from('encumbrances').select('id', { count: 'exact' }),
    supabase.from('planning_records').select('id', { count: 'exact' }),
    supabase.from('building_permissions').select('id', { count: 'exact' }),
    supabase.from('property_tax_records').select('id', { count: 'exact' }),
    supabase.from('utility_records').select('id', { count: 'exact' }),
    supabase.from('restrictions').select('id', { count: 'exact' }),
    supabase.from('parcel_documents').select('id', { count: 'exact' }),
    supabase.from('parcel_history').select('id', { count: 'exact' }),
    supabase.from('audit_logs').select('*').like('action', 'parcel_%').order('created_at', { ascending: false }).limit(10),
  ]);

  const parcels = (parcelsRes.data || []) as Array<Record<string, unknown>>;
  const total = parcelsRes.count || 0;

  const verified = parcels.filter(p => p.verification_status === 'verified').length;
  const pending = parcels.filter(p => p.verification_status === 'pending').length;
  const unverified = parcels.filter(p => p.verification_status === 'unverified').length;
  const rejected = parcels.filter(p => p.verification_status === 'rejected').length;
  const withUlpin = parcels.filter(p => p.ulpin).length;

  const sourceMap = new Map<string, { name: string; count: number; source_type: string }>();
  for (const p of parcels) {
    const src = p.data_sources as Record<string, unknown> | null;
    if (src) {
      const key = src.name as string;
      const existing = sourceMap.get(key);
      if (existing) existing.count++;
      else sourceMap.set(key, { name: key, count: 1, source_type: src.source_type as string });
    }
  }

  const useMap = new Map<string, number>();
  const distMap = new Map<string, number>();
  for (const p of parcels) {
    const lu = (p.land_use as string) || 'other';
    useMap.set(lu, (useMap.get(lu) || 0) + 1);
    const dist = p.district as Record<string, unknown> | null;
    const dn = (dist?.name as string) || 'Unknown';
    distMap.set(dn, (distMap.get(dn) || 0) + 1);
  }

  const recentVerifications = (logsRes.data || []).map((log: Record<string, unknown>) => {
    const details = log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) as Record<string, unknown> : {};
    const parcel = parcels.find(p => p.id === log.entity_id);
    return {
      id: log.id as string,
      parcelId: log.entity_id as string,
      ulpin: parcel?.ulpin as string | null || null,
      surveyNumber: '',
      action: (details.newStatus as string) || log.action as string,
      verifier: (log.user_email as string) || 'System',
      timestamp: log.created_at as string,
    };
  });

  return {
    totalParcels: total,
    verifiedParcels: verified,
    pendingReview: pending,
    unverifiedParcels: unverified,
    rejectedParcels: rejected,
    parcelsWithUlpin: withUlpin,
    parcelsWithoutUlpin: total - withUlpin,
    totalRightsRecords: rightsRes.count || 0,
    totalRegistrations: regsRes.count || 0,
    totalEncumbrances: encRes.count || 0,
    totalPlanningRecords: planRes.count || 0,
    totalBuildingPermissions: buildRes.count || 0,
    totalTaxRecords: taxRes.count || 0,
    totalUtilities: utilRes.count || 0,
    totalRestrictions: restRes.count || 0,
    totalDocuments: docsRes.count || 0,
    totalHistory: histRes.count || 0,
    openConflicts: pending,
    verificationPercentage: total > 0 ? Math.round((verified / total) * 100) : 0,
    sourceCounts: Array.from(sourceMap.values()),
    byLandUse: [...useMap.entries()].map(([land_use, count]) => ({ land_use, count })).sort((a, b) => b.count - a.count),
    byDistrict: [...distMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    recentVerifications,
  };
}
