import { Parcel, DataSource, UnifiedParcelProfile } from '@/types/parcel';

export const AP_STATE_SOURCE: DataSource = {
  id: 'revenue-official',
  name: 'Revenue Department Records',
  type: 'REAL_OFFICIAL',
  department: 'Revenue',
  lastUpdated: '2026-03-15',
  status: 'active',
};

export const DEMO_SOURCE: DataSource = {
  id: 'cadastral-mock',
  name: 'Cadastral Map Data (Demonstration)',
  type: 'DEMONSTRATION',
  department: 'Survey & Land Records',
  lastUpdated: '2026-09-01',
  status: 'active',
};

export const OSM_SOURCE: DataSource = {
  id: 'osm-external',
  name: 'OpenStreetMap',
  type: 'EXTERNAL_OPEN_DATA',
  department: 'External',
  lastUpdated: '2026-09-01',
  status: 'active',
};

export const DEMO_PARCELS: Parcel[] = [
  {
    id: 'p001',
    identity: {
      ulpin: 'AP-KR-VR-GU-000001',
      parcelId: 'PARCEL-001',
      surveyNumber: '102/3',
      hierarchy: {
        state: 'Andhra Pradesh',
        stateCode: 'AP',
        district: 'Krishna',
        districtCode: 'KR',
        mandal: 'Vijayawada Rural',
        mandalCode: 'VR',
        village: 'Gunadala',
        villageCode: 'GU',
      },
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[[80.6220, 16.5200], [80.6230, 16.5200], [80.6230, 16.5210], [80.6220, 16.5210], [80.6220, 16.5200]]],
      crs: 'EPSG:4326',
    },
    landClassification: 'Non-Agricultural',
    landUse: 'residential',
    area: 2250,
    areaUnit: 'sq.yd',
    source: DEMO_SOURCE,
    sourceRecordId: 'DEMO-REC-001',
    dataQualityStatus: 'pending_verification',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  },
  {
    id: 'p002',
    identity: {
      ulpin: 'AP-KR-VR-GU-000002',
      parcelId: 'PARCEL-002',
      surveyNumber: '45/1',
      hierarchy: {
        state: 'Andhra Pradesh',
        stateCode: 'AP',
        district: 'Krishna',
        districtCode: 'KR',
        mandal: 'Vijayawada Rural',
        mandalCode: 'VR',
        village: 'Gunadala',
        villageCode: 'GU',
      },
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[[80.6200, 16.5190], [80.6210, 16.5190], [80.6210, 16.5200], [80.6200, 16.5200], [80.6200, 16.5190]]],
      crs: 'EPSG:4326',
    },
    landClassification: 'Agricultural',
    landUse: 'agricultural',
    area: 1.5,
    areaUnit: 'acres',
    source: AP_STATE_SOURCE,
    sourceRecordId: 'REV-AP-2024-45892',
    dataQualityStatus: 'verified',
    createdAt: '2026-08-15',
    updatedAt: '2026-08-15',
  },
  {
    id: 'p003',
    identity: {
      ulpin: 'AP-KR-VR-GU-000003',
      parcelId: 'PARCEL-003',
      surveyNumber: '78/2',
      subDivisionNumber: 'a',
      hierarchy: {
        state: 'Andhra Pradesh',
        stateCode: 'AP',
        district: 'Krishna',
        districtCode: 'KR',
        mandal: 'Vijayawada Rural',
        mandalCode: 'VR',
        village: 'Gunadala',
        villageCode: 'GU',
      },
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[[80.6240, 16.5180], [80.6250, 16.5180], [80.6250, 16.5190], [80.6240, 16.5190], [80.6240, 16.5180]]],
      crs: 'EPSG:4326',
    },
    landClassification: 'Commercial',
    landUse: 'commercial',
    area: 3500,
    areaUnit: 'sq.ft',
    source: DEMO_SOURCE,
    sourceRecordId: 'DEMO-REC-003',
    dataQualityStatus: 'unverified',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  },
  {
    id: 'p004',
    identity: {
      ulpin: 'AP-KR-VR-GU-000004',
      parcelId: 'PARCEL-004',
      surveyNumber: '201',
      hierarchy: {
        state: 'Andhra Pradesh',
        stateCode: 'AP',
        district: 'Krishna',
        districtCode: 'KR',
        mandal: 'Vijayawada Rural',
        mandalCode: 'VR',
        village: 'Gunadala',
        villageCode: 'GU',
      },
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[[80.6190, 16.5210], [80.6200, 16.5210], [80.6200, 16.5220], [80.6190, 16.5220], [80.6190, 16.5210]]],
      crs: 'EPSG:4326',
    },
    landClassification: 'Residential',
    landUse: 'residential',
    area: 1200,
    areaUnit: 'sq.m',
    source: AP_STATE_SOURCE,
    sourceRecordId: 'REV-AP-2024-78234',
    dataQualityStatus: 'verified',
    createdAt: '2026-07-20',
    updatedAt: '2026-08-10',
  },
  {
    id: 'p005',
    identity: {
      ulpin: 'AP-KR-VR-GU-000005',
      parcelId: 'PARCEL-005',
      surveyNumber: '33/5',
      hierarchy: {
        state: 'Andhra Pradesh',
        stateCode: 'AP',
        district: 'Krishna',
        districtCode: 'KR',
        mandal: 'Vijayawada Rural',
        mandalCode: 'VR',
        village: 'Gunadala',
        villageCode: 'GU',
      },
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[[80.6210, 16.5205], [80.6215, 16.5205], [80.6215, 16.5210], [80.6210, 16.5210], [80.6210, 16.5205]]],
      crs: 'EPSG:4326',
    },
    landClassification: 'Industrial',
    landUse: 'industrial',
    area: 5,
    areaUnit: 'acres',
    source: DEMO_SOURCE,
    sourceRecordId: 'DEMO-REC-005',
    dataQualityStatus: 'pending_verification',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  },
];

export function getDemoParcelByUlpin(ulpin: string): Parcel | undefined {
  return DEMO_PARCELS.find(p => p.identity.ulpin === ulpin);
}

export function getDemoUnifiedProfile(ulpin: string): UnifiedParcelProfile | null {
  const parcel = getDemoParcelByUlpin(ulpin);
  if (!parcel) return null;

  return {
    parcel,
    rights: [
      {
        id: 'r001',
        parcelId: parcel.id,
        ownerName: 'Demo Owner',
        ownerType: 'individual',
        rightType: 'ownership',
        extent: 'Full',
        possessionStatus: 'in_possession',
        recordDate: '2020-05-15',
        source: AP_STATE_SOURCE,
      },
    ],
    registrations: [
      {
        id: 'reg001',
        parcelId: parcel.id,
        documentNumber: 'DOC-2020-45678',
        transactionType: 'sale',
        registrationDate: '2020-05-15',
        transactionStatus: 'completed',
        source: AP_STATE_SOURCE,
      },
    ],
    encumbrances: [
      {
        id: 'enc001',
        parcelId: parcel.id,
        encumbranceStatus: 'clear',
        startDate: '2020-05-15',
        status: 'released',
        source: AP_STATE_SOURCE,
      },
    ],
    planning: {
      id: 'pln001',
      parcelId: parcel.id,
      zoning: parcel.landUse === 'residential' ? 'residential' : parcel.landUse === 'commercial' ? 'commercial' : 'industrial',
      permittedLandUse: parcel.landUse,
      source: DEMO_SOURCE,
    },
    tax: {
      id: 'tax001',
      parcelId: parcel.id,
      assessmentYear: '2025-26',
      propertyAssessment: 2500000,
      taxStatus: 'current',
      lastPaidDate: '2025-06-30',
      source: DEMO_SOURCE,
    },
    utilities: {
      id: 'util001',
      parcelId: parcel.id,
      electricity: true,
      water: true,
      drainage: true,
      roadAccess: true,
      source: DEMO_SOURCE,
    },
    restrictions: [],
    documents: [
      {
        id: 'doc001',
        parcelId: parcel.id,
        documentType: 'Sale Deed',
        documentNumber: 'DOC-2020-45678',
        issueDate: '2020-05-15',
        issuingAuthority: 'Sub-Registrar Office',
        source: AP_STATE_SOURCE,
      },
    ],
    history: [
      {
        id: 'evt001',
        parcelId: parcel.id,
        eventType: 'Registration',
        eventDate: '2020-05-15',
        description: 'Sale deed registered',
        source: AP_STATE_SOURCE,
      },
      {
        id: 'evt002',
        parcelId: parcel.id,
        eventType: 'Mutation',
        eventDate: '2020-06-01',
        description: 'Ownership mutated in revenue records',
        reference: 'MUT-2020-1234',
        source: AP_STATE_SOURCE,
      },
    ],
  };
}
