export interface GisLayer {
  id: string;
  label: string;
  category: 'base' | 'governance' | 'infrastructure' | 'administrative';
  active: boolean;
  available: boolean;
  description: string;
  dataSource?: string;
}

export const GIS_LAYERS: GisLayer[] = [
  { id: 'parcels', label: 'Parcel Boundaries', category: 'base', active: true, available: true, description: 'Cadastral parcel polygons from PostGIS', dataSource: 'Revenue Department' },
  { id: 'labels', label: 'Parcel Labels', category: 'base', active: true, available: true, description: 'Survey number labels (visible from zoom 12)', dataSource: 'Revenue Department' },
  { id: 'land-use', label: 'Land Use', category: 'governance', active: true, available: true, description: 'Colours parcels by recorded land use', dataSource: 'Revenue Department' },
  { id: 'zoning', label: 'Zoning / Master Plan', category: 'governance', active: false, available: true, description: 'Colours parcels by planning/zoning from Town Planning records', dataSource: 'Town Planning Department' },
  { id: 'building-permissions', label: 'Building Permissions', category: 'governance', active: false, available: true, description: 'Highlights parcels by building-permission status', dataSource: 'Town Planning Department' },
  { id: 'restrictions', label: 'Restrictions', category: 'governance', active: false, available: true, description: 'Outlines parcels with restrictions (linked to parcel; no separate restriction boundaries stored)', dataSource: 'Revenue Department' },
  { id: 'property-tax', label: 'Property Tax Status', category: 'infrastructure', active: false, available: true, description: 'Colours parcels by tax payment status (current/arrears)', dataSource: 'Municipal' },
  { id: 'utilities', label: 'Utilities', category: 'infrastructure', active: false, available: true, description: 'Colours parcels by utility connection coverage', dataSource: 'Municipal' },
  { id: 'roads', label: 'Roads / Infrastructure', category: 'infrastructure', active: true, available: false, description: 'No spatial data available — roads are visible on the basemap only' },
  { id: 'state-boundaries', label: 'State Boundaries', category: 'administrative', active: false, available: false, description: 'No spatial data available — boundary polygons are not in the database' },
  { id: 'district-boundaries', label: 'District Boundaries', category: 'administrative', active: false, available: false, description: 'No spatial data available — boundary polygons are not in the database' },
  { id: 'mandal-boundaries', label: 'Mandal Boundaries', category: 'administrative', active: false, available: false, description: 'No spatial data available — boundary polygons are not in the database' },
  { id: 'village-boundaries', label: 'Village/Ward Boundaries', category: 'administrative', active: false, available: false, description: 'No spatial data available — administrative areas exist as text records only' },
];

export function getLayersByCategory(category: GisLayer['category']): GisLayer[] {
  return GIS_LAYERS.filter(l => l.category === category);
}

export function getAvailableLayers(): GisLayer[] {
  return GIS_LAYERS.filter(l => l.available);
}

export function getUnavailableLayers(): GisLayer[] {
  return GIS_LAYERS.filter(l => !l.available);
}
