import { DataSource } from '@/types/parcel';

export const APP_CONFIG = {
  name: 'DharaniSetu',
  tagline: 'One Parcel. One Digital Identity. Connected Governance.',
  description: 'Integrated GIS-based parcel-centric digital land governance platform connecting fragmented land-related datasets through a common parcel identity.',
  version: '0.1.0',
  step: 1,
  isPrototype: true,
} as const;

export const STATE_CONFIG = {
  currentState: {
    code: 'AP',
    name: 'Andhra Pradesh',
    capital: 'Amaravati',
  },
  supportedStates: [
    { code: 'AP', name: 'Andhra Pradesh' },
  ],
} as const;

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'revenue-official',
    name: 'Revenue Department Records',
    type: 'REAL_OFFICIAL',
    department: 'Revenue',
    lastUpdated: '2026-03-15',
    status: 'active',
  },
  {
    id: 'registration-official',
    name: 'Registration Department Records',
    type: 'REAL_OFFICIAL',
    department: 'Registration',
    lastUpdated: '2026-03-10',
    status: 'active',
  },
  {
    id: 'planning-official',
    name: 'Town Planning Department',
    type: 'REAL_OFFICIAL',
    department: 'Planning',
    lastUpdated: '2026-02-28',
    status: 'active',
  },
  {
    id: 'cadastral-mock',
    name: 'Cadastral Map Data (Demonstration)',
    type: 'DEMONSTRATION',
    department: 'Survey & Land Records',
    lastUpdated: '2026-09-01',
    status: 'active',
  },
  {
    id: 'osm-external',
    name: 'OpenStreetMap',
    type: 'EXTERNAL_OPEN_DATA',
    department: 'External',
    lastUpdated: '2026-09-01',
    status: 'active',
  },
];

export const DEMO_DATA_DISCLAIMER = {
  title: 'Demonstration Data Notice',
  message: 'This prototype uses demonstration and publicly available open data for development and testing purposes. Data shown may not represent actual government records.',
  severity: 'info' as const,
};

export const NAVIGATION = {
  public: [
    { label: 'Home', href: '/' },
    { label: 'Search Parcel', href: '/search' },
    { label: 'GIS Explorer', href: '/gis-explorer' },
    { label: 'Services', href: '/services' },
    { label: 'About', href: '/about' },
  ],
  government: [
    { label: 'Dashboard', href: '/government' },
    { label: 'Parcel Verification', href: '/government/verification' },
    { label: 'Data Quality', href: '/government/data-quality' },
    { label: 'Analytics', href: '/government/analytics' },
  ],
};

export const MAP_CONFIG = {
  defaultCenter: [79.6220, 15.9081] as [number, number], // Andhra Pradesh center
  defaultZoom: 7,
  parcelZoom: 15,
  maxZoom: 20,
  minZoom: 3,
  styleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};
