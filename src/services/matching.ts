import { getSupabase } from '@/lib/supabase';

export type MatchType = 'EXACT_MATCH' | 'HIGH_CONFIDENCE' | 'POSSIBLE_MATCH' | 'UNMATCHED' | 'CONFLICT';

export interface ParcelMatch {
  matchType: MatchType;
  confidence: number;
  existingParcelId: string | null;
  existingUlpin: string | null;
  existingSurveyNumber: string | null;
  matchCriteria: string[];
  conflictingFields?: string[];
}

export async function matchParcel(
  surveyNumber: string,
  subdivisionNumber: string | null,
  villageId: string,
  area: number,
  ulpin?: string | null,
  parcelReference?: string | null
): Promise<ParcelMatch> {
  const supabase = getSupabase();

  if (ulpin) {
    const { data } = await supabase
      .from('parcels')
      .select('id, ulpin, survey_number, subdivision_number, area, land_use, village_id')
      .eq('ulpin', ulpin)
      .single();
    if (data) {
      const row = data as { id: string; ulpin: string; survey_number: string; subdivision_number: string; area: number; land_use: string; village_id: string };
      return {
        matchType: 'EXACT_MATCH',
        confidence: 1.0,
        existingParcelId: row.id,
        existingUlpin: row.ulpin,
        existingSurveyNumber: row.survey_number,
        matchCriteria: ['ulpin'],
      };
    }
  }

  if (parcelReference) {
    const { data } = await supabase
      .from('parcels')
      .select('id, ulpin, survey_number, subdivision_number, area, land_use, village_id')
      .eq('parcel_reference', parcelReference)
      .single();
    if (data) {
      const row = data as { id: string; ulpin: string; survey_number: string; subdivision_number: string; area: number; land_use: string; village_id: string };
      const criteria = ['parcel_reference'];
      const areaDiff = Math.abs(row.area - area) / (row.area || 1);
      if (areaDiff < 0.05) criteria.push('area_confirm');
      return {
        matchType: areaDiff < 0.05 ? 'HIGH_CONFIDENCE' : 'POSSIBLE_MATCH',
        confidence: areaDiff < 0.05 ? 0.85 : 0.5,
        existingParcelId: row.id,
        existingUlpin: row.ulpin,
        existingSurveyNumber: row.survey_number,
        matchCriteria: criteria,
      };
    }
  }

  const subDiv = subdivisionNumber || '';
  const { data: candidates } = await supabase
    .from('parcels')
    .select('id, ulpin, survey_number, subdivision_number, area, land_use, village_id')
    .eq('survey_number', surveyNumber)
    .eq('village_id', villageId);

  if (candidates && candidates.length > 0) {
    type CandidateRow = { id: string; ulpin: string; survey_number: string; subdivision_number: string; area: number; land_use: string; village_id: string };
    const rows = candidates as unknown as CandidateRow[];
    const exactSub = rows.find((c) =>
      (c.subdivision_number || '') === subDiv
    );
    if (exactSub) {
      const areaDiff = Math.abs(exactSub.area - area) / (exactSub.area || 1);
      const criteria = ['survey_number', 'village', 'subdivision'];
      if (areaDiff < 0.1) {
        criteria.push('area_confirm');
        return {
          matchType: areaDiff < 0.02 ? 'EXACT_MATCH' : 'HIGH_CONFIDENCE',
          confidence: areaDiff < 0.02 ? 0.95 : 0.8,
          existingParcelId: exactSub.id,
          existingUlpin: exactSub.ulpin,
          existingSurveyNumber: exactSub.survey_number,
          matchCriteria: criteria,
        };
      }
      return {
        matchType: 'POSSIBLE_MATCH',
        confidence: 0.6,
        existingParcelId: exactSub.id,
        existingUlpin: exactSub.ulpin,
        existingSurveyNumber: exactSub.survey_number,
        matchCriteria: criteria,
        conflictingFields: areaDiff > 0.2 ? ['area'] : [],
      };
    }

    return {
      matchType: 'POSSIBLE_MATCH',
      confidence: 0.4,
      existingParcelId: rows[0].id,
      existingUlpin: rows[0].ulpin,
      existingSurveyNumber: rows[0].survey_number,
      matchCriteria: ['survey_number', 'village'],
      conflictingFields: ['subdivision_number'],
    };
  }

  return {
    matchType: 'UNMATCHED',
    confidence: 0,
    existingParcelId: null,
    existingUlpin: null,
    existingSurveyNumber: null,
    matchCriteria: [],
  };
}

export async function batchMatch(
  records: Array<{
    surveyNumber: string;
    subdivisionNumber?: string | null;
    villageId: string;
    area: number;
    ulpin?: string | null;
    parcelReference?: string | null;
  }>
): Promise<ParcelMatch[]> {
  const results: ParcelMatch[] = [];
  for (const record of records) {
    const match = await matchParcel(
      record.surveyNumber,
      record.subdivisionNumber || null,
      record.villageId,
      record.area,
      record.ulpin,
      record.parcelReference
    );
    results.push(match);
  }
  return results;
}
