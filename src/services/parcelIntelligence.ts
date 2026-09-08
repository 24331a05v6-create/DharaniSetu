import { getSupabase } from '@/lib/supabase';

export interface ParcelIntelligence {
  parcelId: string;
  completeness: 'Complete' | 'Partially Complete' | 'Missing Information';
  completenessScore: number;
  consistency: 'Consistent' | 'Needs Review' | 'Conflicting';
  sourceCoverage: {
    rights: boolean;
    registration: boolean;
    planning: boolean;
    tax: boolean;
    utilities: boolean;
    restrictions: boolean;
  };
  totalDomains: number;
  coveredDomains: number;
}

export async function getParcelIntelligence(parcelId: string): Promise<ParcelIntelligence | null> {
  const supabase = getSupabase();
  
  const [parcelRes, rightsRes, regRes, planRes, taxRes, utilRes, restRes] = await Promise.all([
    (supabase.from('parcels') as any).select('id, ulpin, survey_number, area, land_use, land_classification, subdivision_number, parcel_reference, verification_status').eq('id', parcelId).single(),
    (supabase.from('rights_records') as any).select('id', { count: 'exact', head: true }).eq('parcel_id', parcelId),
    (supabase.from('registration_records') as any).select('id', { count: 'exact', head: true }).eq('parcel_id', parcelId),
    (supabase.from('planning_records') as any).select('id', { count: 'exact', head: true }).eq('parcel_id', parcelId),
    (supabase.from('property_tax_records') as any).select('id', { count: 'exact', head: true }).eq('parcel_id', parcelId),
    (supabase.from('utility_records') as any).select('id', { count: 'exact', head: true }).eq('parcel_id', parcelId),
    (supabase.from('restrictions') as any).select('id', { count: 'exact', head: true }).eq('parcel_id', parcelId),
  ]);

  if (!parcelRes.data) return null;
  const p = parcelRes.data as Record<string, unknown>;

  // Calculate completeness based on core fields
  let filledFields = 0;
  let totalFields = 10;
  if (p.ulpin) filledFields++;
  if (p.survey_number) filledFields++;
  if (p.area && (p.area as number) > 0) filledFields++;
  if (p.land_use && p.land_use !== 'other') filledFields++;
  if (p.land_classification) filledFields++;
  if (p.subdivision_number) filledFields++;
  if (p.parcel_reference) filledFields++;
  if (p.verification_status === 'verified') filledFields++;
  if ((rightsRes.count || 0) > 0) filledFields++;
  if ((planRes.count || 0) > 0) filledFields++;

  const completenessScore = Math.round((filledFields / totalFields) * 100);
  const completeness: ParcelIntelligence['completeness'] = completenessScore >= 80 ? 'Complete' : completenessScore >= 50 ? 'Partially Complete' : 'Missing Information';

  // Source coverage
  const sourceCoverage = {
    rights: (rightsRes.count || 0) > 0,
    registration: (regRes.count || 0) > 0,
    planning: (planRes.count || 0) > 0,
    tax: (taxRes.count || 0) > 0,
    utilities: (utilRes.count || 0) > 0,
    restrictions: (restRes.count || 0) > 0,
  };
  const coveredDomains = Object.values(sourceCoverage).filter(Boolean).length;
  const totalDomains = 6;

  // Consistency: check for data conflicts
  const supabaseClient = getSupabase();
  const conflictsRes = await (supabaseClient.from('data_conflicts') as any).select('id', { count: 'exact', head: true }).eq('parcel_id', parcelId).eq('status', 'open');
  const conflictCount = conflictsRes.count || 0;
  const consistency: ParcelIntelligence['consistency'] = conflictCount > 0 ? 'Conflicting' : (p.verification_status === 'verified' && coveredDomains >= 3) ? 'Consistent' : 'Needs Review';

  return {
    parcelId,
    completeness,
    completenessScore,
    consistency,
    sourceCoverage,
    totalDomains,
    coveredDomains,
  };
}
