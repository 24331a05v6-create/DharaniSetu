export interface StateAdapterConfig {
  stateCode: string;
  stateName: string;
  fieldMappings: FieldMapping[];
  sourceSystemUrl?: string;
  notes?: string;
}

export interface FieldMapping {
  externalField: string;
  internalField: string;
  required: boolean;
  defaultValue?: string;
  transform?: (value: string) => string;
}

export const STATE_ADAPTERS: Record<string, StateAdapterConfig> = {
  AP: {
    stateCode: 'AP',
    stateName: 'Andhra Pradesh',
    notes: 'Andhra Pradesh land records integration',
    fieldMappings: [
      { externalField: 'survey_no', internalField: 'survey_number', required: true },
      { externalField: 'sub_division', internalField: 'subdivision_number', required: false },
      { externalField: 'village_name', internalField: 'village_name', required: true },
      { externalField: 'mandal_name', internalField: 'mandal_name', required: true },
      { externalField: 'district_name', internalField: 'district_name', required: true },
      { externalField: 'land_area', internalField: 'area', required: true, transform: (v) => parseFloat(v).toString() },
      { externalField: 'area_unit', internalField: 'area_unit', required: false, defaultValue: 'acres' },
      { externalField: 'land_use', internalField: 'land_use', required: false, defaultValue: 'other' },
      { externalField: 'owner_name', internalField: 'rights_holder_name', required: false },
      { externalField: 'owner_type', internalField: 'rights_holder_type', required: false, defaultValue: 'individual' },
      { externalField: 'parcel_id', internalField: 'parcel_reference', required: false },
    ],
  },
  TN: {
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    notes: 'Tamil Nadu land records (Patta/Chitta) integration',
    fieldMappings: [
      { externalField: 'survey_no', internalField: 'survey_number', required: true },
      { externalField: 'subdivision', internalField: 'subdivision_number', required: false },
      { externalField: 'village', internalField: 'village_name', required: true },
      { externalField: 'taluk', internalField: 'mandal_name', required: true },
      { externalField: 'district', internalField: 'district_name', required: true },
      { externalField: 'extent', internalField: 'area', required: true, transform: (v) => parseFloat(v).toString() },
      { externalField: 'land_type', internalField: 'land_use', required: false, defaultValue: 'other' },
      { externalField: 'patta_no', internalField: 'parcel_reference', required: false },
    ],
  },
  CH: {
    stateCode: 'CH',
    stateName: 'Chandigarh',
    notes: 'Chandigarh UT land records integration',
    fieldMappings: [
      { externalField: 'plot_no', internalField: 'survey_number', required: true },
      { externalField: 'sector', internalField: 'village_name', required: true },
      { externalField: 'district', internalField: 'district_name', required: true, defaultValue: 'Chandigarh' },
      { externalField: 'area_sqm', internalField: 'area', required: true, transform: (v) => parseFloat(v).toString() },
      { externalField: 'area_unit', internalField: 'area_unit', required: false, defaultValue: 'sq.m' },
      { externalField: 'land_use', internalField: 'land_use', required: false, defaultValue: 'residential' },
    ],
  },
};

export function getStateAdapter(stateCode: string): StateAdapterConfig | null {
  return STATE_ADAPTERS[stateCode] || null;
}

export function getAvailableStates(): { code: string; name: string }[] {
  return Object.values(STATE_ADAPTERS).map(a => ({ code: a.stateCode, name: a.stateName }));
}
