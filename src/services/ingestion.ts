import { getSupabase } from '@/lib/supabase';
import { StateAdapterConfig, getStateAdapter } from './adapters';

export type IngestionStatus = 'VALID' | 'NEEDS_REVIEW' | 'INVALID';

export interface IngestionRecord {
  externalData: Record<string, unknown>;
  sourceId: string;
  sourceRecordId: string;
  stateCode: string;
}

export interface IngestionResult {
  status: IngestionStatus;
  parcelId?: string;
  errors: string[];
  warnings: string[];
  mappedData: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  status: IngestionStatus;
  errors: string[];
  warnings: string[];
}

function mapFields(externalData: Record<string, unknown>, adapter: StateAdapterConfig): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const mapping of adapter.fieldMappings) {
    const raw = externalData[mapping.externalField];
    if (raw !== undefined && raw !== null && raw !== '') {
      mapped[mapping.internalField] = mapping.transform ? mapping.transform(String(raw)) : raw;
    } else if (mapping.defaultValue !== undefined) {
      mapped[mapping.internalField] = mapping.defaultValue;
    } else if (mapping.required) {
      mapped[mapping.internalField] = null;
    }
  }
  return mapped;
}

function validateRecord(mappedData: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mappedData.survey_number) errors.push('Missing required field: survey_number');
  if (!mappedData.village_name) errors.push('Missing required field: village_name');
  if (!mappedData.mandal_name) errors.push('Missing required field: mandal_name');
  if (!mappedData.district_name) errors.push('Missing required field: district_name');

  if (mappedData.area !== undefined && mappedData.area !== null) {
    const area = Number(mappedData.area);
    if (isNaN(area) || area <= 0) errors.push('Invalid area value');
  } else {
    warnings.push('Area not provided');
  }

  if (mappedData.ulpin && typeof mappedData.ulpin === 'string') {
    const ulpinPattern = /^[A-Z]{2}-[A-Z]{2}-[A-Z]{2}-[A-Z]{2}-\d{4,}$/;
    if (!ulpinPattern.test(mappedData.ulpin as string)) warnings.push('ULPIN format may be invalid');
  }

  const validLandUses = ['residential', 'commercial', 'industrial', 'agricultural', 'institutional', 'recreational', 'vacant', 'other'];
  if (mappedData.land_use && !validLandUses.includes(mappedData.land_use as string)) {
    warnings.push(`Unknown land_use: ${mappedData.land_use}`);
    mappedData.land_use = 'other';
  }

  const isValid = errors.length === 0;
  const status: IngestionStatus = errors.length > 0 ? 'INVALID' : warnings.length > 0 ? 'NEEDS_REVIEW' : 'VALID';
  return { isValid, status, errors, warnings };
}

export async function ingestSingleRecord(record: IngestionRecord): Promise<IngestionResult> {
  const adapter = getStateAdapter(record.stateCode);
  if (!adapter) {
    return { status: 'INVALID', errors: [`No adapter found for state: ${record.stateCode}`], warnings: [], mappedData: {} };
  }

  const mappedData = mapFields(record.externalData, adapter);
  const validation = validateRecord(mappedData);

  return {
    status: validation.status,
    errors: validation.errors,
    warnings: validation.warnings,
    mappedData,
  };
}

export async function ingestBatch(records: IngestionRecord[]): Promise<{ total: number; valid: number; needsReview: number; invalid: number; results: IngestionResult[] }> {
  const results: IngestionResult[] = [];
  let valid = 0, needsReview = 0, invalid = 0;

  for (const record of records) {
    const result = await ingestSingleRecord(record);
    results.push(result);
    if (result.status === 'VALID') valid++;
    else if (result.status === 'NEEDS_REVIEW') needsReview++;
    else invalid++;
  }

  return { total: records.length, valid, needsReview, invalid, results };
}

export async function insertIngestedParcel(mappedData: Record<string, unknown>, sourceId: string, sourceRecordId: string): Promise<string | null> {
  const supabase = getSupabase();

  const { data: state } = await supabase.from('states').select('id').ilike('name', `%${mappedData.state_name || ''}%`).single() as { data: { id: string } | null };
  const { data: district } = await supabase.from('districts').select('id').ilike('name', `%${mappedData.district_name || ''}%`).single() as { data: { id: string } | null };
  const { data: mandal } = await supabase.from('mandals').select('id').ilike('name', `%${mappedData.mandal_name || ''}%`).single() as { data: { id: string } | null };
  const { data: village } = await supabase.from('villages').select('id').ilike('name', `%${mappedData.village_name || ''}%`).single() as { data: { id: string } | null };

  if (!state || !district || !mandal || !village) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('parcels') as any).insert({
    survey_number: mappedData.survey_number as string,
    subdivision_number: mappedData.subdivision_number as string || null,
    parcel_reference: mappedData.parcel_reference as string || null,
    state_id: state.id,
    district_id: district.id,
    mandal_id: mandal.id,
    village_id: village.id,
    area: mappedData.area ? Number(mappedData.area) : 0,
    area_unit: (mappedData.area_unit as string) || 'acres',
    land_use: (mappedData.land_use as string) || 'other',
    land_classification: (mappedData.land_classification as string) || null,
    source_id: sourceId,
    source_record_id: sourceRecordId,
    data_status: 'imported',
    verification_status: 'unverified',
  }).select('id').single();

  if (error || !data) return null;

  if (mappedData.rights_holder_name) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('rights_records') as any).insert({
      parcel_id: data.id,
      rights_holder_name: mappedData.rights_holder_name as string,
      rights_holder_type: (mappedData.rights_holder_type as string) || 'individual',
      right_type: 'ownership',
      extent: 'Full',
      possession_status: 'in_possession',
      is_demonstration: false,
    });
  }

  return data.id;
}
