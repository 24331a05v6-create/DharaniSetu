export type DataSourceType = 'REAL_OFFICIAL' | 'OPEN_DATA' | 'EXTERNAL_OPEN_DATA' | 'DEMONSTRATION' | 'MOCK_API';

export type DataQualityStatus = 'verified' | 'pending_verification' | 'unverified' | 'disputed';

export type RightType = 'ownership' | 'leasehold' | 'mortgagee' | 'licensee' | 'easement' | 'other';

export type TransactionType = 'sale' | 'gift' | 'partition' | 'mortgage' | 'lease' | 'surrender' | 'other';

export type EncumbranceStatus = 'clear' | 'encumbered' | 'disputed' | 'unknown';

export type LandUseCategory = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'institutional' | 'recreational' | 'transportation' | 'vacant' | 'other';

export type ZoningType = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed_use' | 'green_zone' | 'special_zone';

export type RestrictionType = 'court_order' | 'government_acquisition' | 'environmental' | 'heritage' | 'rent_control' | 'other';

export type UserRole = 'citizen' | 'revenue_officer' | 'registration_officer' | 'planning_officer' | 'municipal_officer' | 'administrator';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  department: string;
  lastUpdated: string;
  status: 'active' | 'inactive' | 'pending_integration';
}

export interface AdministrativeHierarchy {
  state: string;
  stateCode: string;
  district: string;
  districtCode: string;
  mandal: string;
  mandalCode: string;
  village: string;
  villageCode: string;
  ward?: string;
  wardCode?: string;
  localBody?: string;
}

export interface ParcelIdentity {
  ulpin: string;
  parcelId: string;
  surveyNumber: string;
  subDivisionNumber?: string;
  hierarchy: AdministrativeHierarchy;
}

export interface ParcelGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
  crs: string;
  area?: number;
  areaUnit?: string;
}

export interface Parcel {
  id: string;
  identity: ParcelIdentity;
  geometry: ParcelGeometry;
  landClassification: string;
  landUse: LandUseCategory;
  area: number;
  areaUnit: string;
  source: DataSource;
  sourceRecordId: string;
  lastVerifiedAt?: string;
  dataQualityStatus: DataQualityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RightsRecord {
  id: string;
  parcelId: string;
  ownerName: string;
  ownerType: 'individual' | 'joint' | 'government' | 'corporate' | 'trust' | 'other';
  rightType: RightType;
  extent: string;
  share?: string;
  possessionStatus: 'in_possession' | 'not_in_possession' | 'disputed';
  mutationReference?: string;
  recordDate: string;
  source: DataSource;
}

export interface RegistrationRecord {
  id: string;
  parcelId: string;
  documentNumber: string;
  transactionType: TransactionType;
  registrationDate: string;
  transactionStatus: 'completed' | 'pending' | 'cancelled' | 'disputed';
  executionDate?: string;
  considerationAmount?: number;
  stampDuty?: number;
  source: DataSource;
}

export interface EncumbranceRecord {
  id: string;
  parcelId: string;
  encumbranceStatus: EncumbranceStatus;
  chargeType?: 'mortgage' | 'lien' | 'attachment' | 'court_order' | 'other';
  mortgageReference?: string;
  registrationReference?: string;
  startDate: string;
  releaseDate?: string;
  status: 'active' | 'released' | 'disputed';
  source: DataSource;
}

export interface PlanningRecord {
  id: string;
  parcelId: string;
  zoning: ZoningType;
  masterPlanZone?: string;
  permittedLandUse: string;
  developmentRestrictions?: string;
  roadReservation?: boolean;
  buildingRestrictions?: string;
  source: DataSource;
}

export interface TaxRecord {
  id: string;
  parcelId: string;
  assessmentYear: string;
  propertyAssessment: number;
  taxStatus: 'current' | 'arrears' | 'exempted' | 'under_assessment';
  arrearsAmount?: number;
  valuationReference?: string;
  lastPaidDate?: string;
  source: DataSource;
}

export interface UtilityRecord {
  id: string;
  parcelId: string;
  electricity: boolean;
  water: boolean;
  drainage: boolean;
  roadAccess: boolean;
  provider?: string;
  connectionId?: string;
  source: DataSource;
}

export interface RestrictionRecord {
  id: string;
  parcelId: string;
  restrictionType: RestrictionType;
  description: string;
  affectedArea?: string;
  sourceAuthority: string;
  effectiveDate: string;
  expiryDate?: string;
  reviewDate?: string;
  source: DataSource;
}

export interface UnifiedParcelProfile {
  parcel: Parcel;
  rights: RightsRecord[];
  registrations: RegistrationRecord[];
  encumbrances: EncumbranceRecord[];
  planning?: PlanningRecord;
  tax?: TaxRecord;
  utilities?: UtilityRecord;
  restrictions: RestrictionRecord[];
  documents: ParcelDocument[];
  history: ParcelEvent[];
}

export interface ParcelDocument {
  id: string;
  parcelId: string;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  issuingAuthority: string;
  source: DataSource;
}

export interface ParcelEvent {
  id: string;
  parcelId: string;
  eventType: string;
  eventDate: string;
  description: string;
  reference?: string;
  source: DataSource;
}

export interface SearchFilters {
  ulpin?: string;
  surveyNumber?: string;
  ownerName?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
  landUse?: LandUseCategory;
  encumbranceStatus?: EncumbranceStatus;
}

export interface SearchResult {
  parcel: Parcel;
  rights: RightsRecord[];
  relevanceScore: number;
}
