'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG } from '@/config/app';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { GIS_LAYERS, getLayersByCategory, type GisLayer } from '@/services/gisLayers';
import { DataDisclaimer, DataSourceBadge } from '@/components/common/DataSourceBadge';
import { DEMO_PARCELS } from '@/services/mockData';
import { useLanguage } from '@/i18n';
import {
  getParcelById,
  getRightsByParcelId,
  getRegistrationsByParcelId,
  getEncumbrancesByParcelId,
  getPlanningByParcelId,
  getBuildingPermissionsByParcelId,
  getTaxByParcelId,
  getUtilitiesByParcelId,
  getRestrictionsByParcelId,
  getDocumentsByParcelId,
  getHistoryByParcelId,
  type FullParcelProfile,
  type RelatedRecord,
} from '@/services/parcelProfile';

interface ParcelFeature {
  id: string;
  ulpin: string | null;
  survey_number: string;
  subdivision_number: string | null;
  area: number;
  area_unit: string;
  land_use: string;
}

interface FilterState {
  state_id: string;
  district_id: string;
  mandal_id: string;
  village_id: string;
  land_use: string;
  verification_status: string;
}

interface Option {
  id: string;
  name: string;
}

const LAND_USE_COLORS: Record<string, string> = {
  residential: '#3b82f6',
  commercial: '#f59e0b',
  industrial: '#6b7280',
  agricultural: '#10b981',
  institutional: '#8b5cf6',
  recreational: '#06b6d4',
  vacant: '#d1d5db',
  other: '#9ca3af',
};

const LAND_USE_OPTIONS = ['residential', 'commercial', 'industrial', 'agricultural', 'institutional', 'recreational', 'vacant', 'other'];
const VERIFICATION_OPTIONS = ['verified', 'pending', 'unverified', 'disputed'];

// Lightweight map payload: scalar parcel fields + geometry (no hierarchy joins).
const PARCEL_SELECT = `id, ulpin, survey_number, subdivision_number, area, area_unit, land_use, geometry`;

// --- Geodesic area (spherical excess, no new dependencies) ---
const EARTH_R = 6378137;
function ringAreaSqm(ring: number[][]): number {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    total += ((x2 - x1) * Math.PI) / 180 * (2 + Math.sin((y1 * Math.PI) / 180) + Math.sin((y2 * Math.PI) / 180));
  }
  return (total * EARTH_R * EARTH_R) / 2;
}

function gisAreaSqm(geom: unknown): number | null {
  try {
    const g = geom as { type?: string; coordinates?: unknown } | null;
    if (!g || typeof g.type !== 'string' || !Array.isArray(g.coordinates)) return null;
    if (g.type === 'Polygon') {
      const rings = g.coordinates as number[][][];
      if (!rings.length) return null;
      let area = Math.abs(ringAreaSqm(rings[0]));
      for (let i = 1; i < rings.length; i++) area -= Math.abs(ringAreaSqm(rings[i]));
      return Math.abs(area);
    }
    if (g.type === 'MultiPolygon') {
      let area = 0;
      for (const poly of g.coordinates as number[][][][]) {
        if (!poly.length) continue;
        let a = Math.abs(ringAreaSqm(poly[0]));
        for (let i = 1; i < poly.length; i++) a -= Math.abs(ringAreaSqm(poly[i]));
        area += Math.abs(a);
      }
      return area;
    }
    return null;
  } catch {
    return null;
  }
}

const SQM_PER_UNIT: Record<string, number> = {
  'sq.m': 1, sqm: 1, acres: 4046.8564224, acre: 4046.8564224,
  'sq.ft': 0.09290304, 'sq.yd': 0.83612736, guntas: 101.1717, cents: 40.4686,
};

interface SelectedDetail {
  profile: FullParcelProfile;
  rights: RelatedRecord[];
  registrations: RelatedRecord[];
  encumbrances: RelatedRecord[];
  planning: RelatedRecord | null;
  building: RelatedRecord[];
  tax: RelatedRecord | null;
  utilities: RelatedRecord | null;
  restrictions: RelatedRecord[];
  docCount: number;
  history: RelatedRecord[];
  gisAreaSqm: number | null;
  areaMismatch: boolean;
}

const CATEGORY_LABELS: Record<string, 'baseLayers' | 'governance' | 'infrastructure' | 'administrative'> = {
  base: 'baseLayers',
  governance: 'governance',
  infrastructure: 'infrastructure',
  administrative: 'administrative',
};

function getColor(landUse: string): string {
  return LAND_USE_COLORS[landUse] || '#9ca3af';
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right break-words">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-3 mb-1">{children}</h5>;
}

function DetailPanel({
  light, detail, loading, error, onClose, onLocate,
}: {
  light: ParcelFeature;
  detail: SelectedDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onLocate: () => void;
}) {
  const { t } = useLanguage();
  const p = detail?.profile;
  const rights0 = detail?.rights[0] as Record<string, unknown> | undefined;
  const reg0 = detail?.registrations[0] as Record<string, unknown> | undefined;
  const encActive = (detail?.encumbrances || []).filter(e => (e as Record<string, unknown>).status === 'active').length;
  const util = detail?.utilities as Record<string, unknown> | null;
  const utilOn = util ? ['electricity', 'water', 'drainage', 'road_access'].filter(k => util[k] === true).length : null;
  return (
    <div className="absolute inset-x-4 bottom-4 top-auto max-h-[46vh] w-auto sm:w-80 sm:max-w-[calc(100%-2rem)] lg:left-4 lg:right-auto lg:top-4 lg:bottom-16 lg:max-h-none bg-white rounded-xl shadow-lg border border-gray-200 z-10 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {light.survey_number}{light.subdivision_number ? `/${light.subdivision_number}` : ''}
          </h4>
          {light.ulpin && <p className="font-mono text-xs text-gray-500">{light.ulpin}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title={t.gis.closePanel} aria-label={t.gis.closePanel}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-xs text-gray-500">{t.gis.loadingDetails}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <SectionTitle>{t.gis.overview}</SectionTitle>
        <DetailRow label={t.gis.survey} value={`${light.survey_number}${light.subdivision_number ? `/${light.subdivision_number}` : ''}`} />
        <DetailRow label={t.gis.areaRecorded} value={`${light.area} ${light.area_unit}`} />
        {detail && (
          <>
            <DetailRow
              label={t.gis.areaGis}
              value={detail.gisAreaSqm !== null ? `${Math.round(detail.gisAreaSqm).toLocaleString('en-IN')} sq.m` : t.gis.areaUnavailable}
            />
            {detail.areaMismatch && (
              <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                {t.gis.areaMismatch}
              </p>
            )}
          </>
        )}
        <DetailRow label={t.gis.landUseLabel} value={<span className="capitalize">{light.land_use}</span>} />
        {p && (
          <>
            <DetailRow label={t.gis.classification} value={String(p.land_classification || '—')} />
            <DetailRow label={t.gis.status} value={String(p.verification_status)} />
            <DetailRow
              label={t.gis.location}
              value={`${p.village.name}, ${p.mandal.name}, ${p.district.name}`}
            />
          </>
        )}
        {detail && (
          <>
            <SectionTitle>{t.gis.ownership}</SectionTitle>
            {rights0 ? (
              <>
                <DetailRow label={t.gis.holder} value={String(rights0.rights_holder_name || '—')} />
                <DetailRow label={t.gis.rightsType} value={`${String(rights0.right_type || '—')} · ${String(rights0.rights_holder_type || '—')}`} />
                <DetailRow label={t.gis.share} value={String(rights0.share || '—')} />
                <DetailRow label={t.gis.possession} value={String(rights0.possession_status || '—')} />
              </>
            ) : (
              <p className="text-xs text-gray-500">{t.services.noRights}</p>
            )}
            <SectionTitle>{t.gis.governanceSec}</SectionTitle>
            <DetailRow label={t.gis.registration} value={reg0 ? `${String(reg0.document_number)} · ${String(reg0.registration_date || '')}` : t.common.none} />
            <DetailRow label={t.gis.encumbrance} value={encActive > 0 ? `${encActive} ${t.gis.connected}` : t.common.none} />
            <DetailRow label={t.gis.zoning} value={detail.planning ? String((detail.planning as Record<string, unknown>).zoning || '—') : t.common.none} />
            <DetailRow
              label={t.gis.building}
              value={detail.building.length > 0 ? String((detail.building[0] as Record<string, unknown>).approval_status || '—') : t.common.none}
            />
            <DetailRow label={t.gis.restrictions} value={detail.restrictions.length > 0 ? `${detail.restrictions.length} ${t.gis.connected}` : t.common.none} />
            <SectionTitle>{t.gis.fiscal}</SectionTitle>
            <DetailRow
              label={t.gis.tax}
              value={detail.tax ? `${String((detail.tax as Record<string, unknown>).payment_status)} · ₹${Number((detail.tax as Record<string, unknown>).tax_amount || 0).toLocaleString('en-IN')}` : t.common.none}
            />
            <DetailRow label={t.gis.utilities} value={utilOn !== null ? `${utilOn}/4 ${t.gis.connected}` : t.common.none} />
            <SectionTitle>{t.gis.docsHistory}</SectionTitle>
            <DetailRow label={t.gis.documents} value={`${detail.docCount} ${t.gis.connected}`} />
            <DetailRow label={t.gis.events} value={`${detail.history.length} ${t.gis.connected}`} />
            {(detail.history.slice(0, 3) as Record<string, unknown>[]).map(h => (
              <p key={String(h.id)} className="text-xs text-gray-500 truncate">
                {String(h.event_date || '')} · {String(h.event_type || '')}
              </p>
            ))}
          </>
        )}
      </div>
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
        {light.ulpin && (
          <Link
            href={`/parcel/profile?ulpin=${light.ulpin}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {t.gis.viewFullProfile}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}
        {light.ulpin && (
          <Link
            href={`/services?ulpin=${encodeURIComponent(light.ulpin)}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {t.gis.services}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}
        <button onClick={onLocate} className="text-xs font-medium text-gray-600 hover:text-gray-900">
          {t.gis.zoomToParcel}
        </button>
      </div>
    </div>
  );
}

function layerLabel(id: string, t: ReturnType<typeof useLanguage>['t']): string {
  switch (id) {
    case 'parcels': return t.layers.parcels;
    case 'labels': return t.layers.labels;
    case 'land-use': return t.layers.landUse;
    case 'zoning': return t.layers.zoning;
    case 'building-permissions': return t.layers.buildings;
    case 'restrictions': return t.layers.restrictions;
    case 'property-tax': return t.layers.tax;
    case 'utilities': return t.layers.utilities;
    case 'roads': return t.layers.roads;
    case 'state-boundaries': return t.layers.state;
    case 'district-boundaries': return t.layers.district;
    case 'mandal-boundaries': return t.layers.mandal;
    case 'village-boundaries': return t.layers.village;
    default: return id;
  }
}

export default function GisExplorerPage() {
  const { t } = useLanguage();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [layers, setLayers] = useState<GisLayer[]>(GIS_LAYERS);
  const [selectedParcel, setSelectedParcel] = useState<ParcelFeature | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parcelCount, setParcelCount] = useState(0);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [overlayEmpty, setOverlayEmpty] = useState<string[]>([]);
  const [mapSearch, setMapSearch] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<ParcelFeature[]>([]);
  const [mapSearching, setMapSearching] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    state_id: '',
    district_id: '',
    mandal_id: '',
    village_id: '',
    land_use: '',
    verification_status: '',
  });

  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [mandals, setMandals] = useState<Option[]>([]);
  const [villages, setVillages] = useState<Option[]>([]);

  const supabase = getSupabase();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStates([{ id: 'ap-state', name: 'Andhra Pradesh' }]);
      return;
    }
    supabase.from('states').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setStates(data); });
  }, []);

  useEffect(() => {
    if (!filters.state_id) { setDistricts([]); return; }
    if (!isSupabaseConfigured()) {
      setDistricts([{ id: 'kr-district', name: 'Krishna' }]);
      setFilters(prev => ({ ...prev, district_id: '', mandal_id: '', village_id: '' }));
      return;
    }
    supabase.from('districts').select('id, name').eq('state_id', filters.state_id).eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setDistricts(data); });
    setFilters(prev => ({ ...prev, district_id: '', mandal_id: '', village_id: '' }));
  }, [filters.state_id]);

  useEffect(() => {
    if (!filters.district_id) { setMandals([]); return; }
    if (!isSupabaseConfigured()) {
      setMandals([{ id: 'vr-mandal', name: 'Vijayawada Rural' }]);
      setFilters(prev => ({ ...prev, mandal_id: '', village_id: '' }));
      return;
    }
    supabase.from('mandals').select('id, name').eq('district_id', filters.district_id).eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setMandals(data); });
    setFilters(prev => ({ ...prev, mandal_id: '', village_id: '' }));
  }, [filters.district_id]);

  useEffect(() => {
    if (!filters.mandal_id) { setVillages([]); return; }
    if (!isSupabaseConfigured()) {
      setVillages([{ id: 'gu-village', name: 'Gunadala' }]);
      setFilters(prev => ({ ...prev, village_id: '' }));
      return;
    }
    supabase.from('villages').select('id, name').eq('mandal_id', filters.mandal_id).eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setVillages(data); });
    setFilters(prev => ({ ...prev, village_id: '' }));
  }, [filters.mandal_id]);

  const updateSelectionFilter = useCallback(() => {
    if (!map.current) return;
    const id = selectedParcel?.id || '__none__';
    for (const layerId of ['parcels-selected', 'parcels-selected-fill']) {
      try {
        if (map.current.getLayer(layerId)) {
          map.current.setFilter(layerId, ['==', ['get', 'id'], id]);
        }
      } catch { /* layer not ready yet */ }
    }
  }, [selectedParcel]);

  const [detailError, setDetailError] = useState<string | null>(null);

  // Fetch full parcel detail (all related domains) only after a parcel is clicked.
  const selectParcel = useCallback(async (light: ParcelFeature) => {
    setSelectedParcel(light);
    setSelectedDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const profile = await getParcelById(light.id);
      if (!profile) throw new Error('Parcel record not found in the database.');
      const [rights, registrations, encumbrances, planning, building, tax, utilities, restrictions, documents, history] =
        await Promise.all([
          getRightsByParcelId(light.id),
          getRegistrationsByParcelId(light.id),
          getEncumbrancesByParcelId(light.id),
          getPlanningByParcelId(light.id),
          getBuildingPermissionsByParcelId(light.id),
          getTaxByParcelId(light.id),
          getUtilitiesByParcelId(light.id),
          getRestrictionsByParcelId(light.id),
          getDocumentsByParcelId(light.id),
          getHistoryByParcelId(light.id),
        ]);
      const gis = gisAreaSqm(profile.geometry);
      const perUnit = SQM_PER_UNIT[profile.area_unit];
      const recordedSqm = perUnit ? profile.area * perUnit : null;
      const areaMismatch =
        gis !== null && recordedSqm !== null && recordedSqm > 0
          ? Math.abs(gis - recordedSqm) / recordedSqm > 0.05
          : false;
      setSelectedDetail({
        profile, rights, registrations, encumbrances, planning, building,
        tax, utilities, restrictions, docCount: documents.length, history,
        gisAreaSqm: gis, areaMismatch,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load parcel details';
      console.error('[DharaniSetu] GIS detail error:', msg);
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  }, []);
  const selectParcelRef = useRef(selectParcel);
  selectParcelRef.current = selectParcel;

  const pendingFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const u = new URLSearchParams(window.location.search).get('ulpin');
    if (u) pendingFocusRef.current = u.trim();
  }, []);

  function lightFromRow(row: Record<string, unknown>): ParcelFeature {
    return {
      id: row.id as string,
      ulpin: row.ulpin as string | null,
      survey_number: row.survey_number as string,
      subdivision_number: row.subdivision_number as string | null,
      area: row.area as number,
      area_unit: row.area_unit as string,
      land_use: row.land_use as string,
    };
  }

  const focusParcelByText = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || !isSupabaseConfigured()) return;
    setMapSearching(true);
    setMapSearchResults([]);
    try {
      const { data, error } = await getSupabase()
        .from('parcels')
        .select(PARCEL_SELECT)
        .or(`ulpin.ilike.%${q}%,survey_number.ilike.%${q}%`)
        .limit(5);
      if (error) throw error;
      const rows = (data || []) as unknown as Record<string, unknown>[];
      const lights = rows.map(lightFromRow);
      setMapSearchResults(lights);
      if (lights.length > 0) {
        const first = rows[0];
        const geom = first.geometry as GeoJSON.Geometry | null;
        if (geom && map.current) {
          const bounds = extractBounds([{ type: 'Feature', id: lights[0].id, properties: {}, geometry: geom } as GeoJSON.Feature]);
          if (bounds) {
            try {
              map.current.fitBounds(bounds, { padding: 80, maxZoom: 17 });
            } catch { /* ignore */ }
          }
        }
        await selectParcelRef.current(lights[0]);
      }
    } catch (err) {
      console.error('[DharaniSetu] GIS search error:', err instanceof Error ? err.message : err);
    } finally {
      setMapSearching(false);
    }
  }, []);

  // Overlay enrichment cache: parcelId -> extra props (zoning, tax, building, restriction, utilities)
  const overlayCacheRef = useRef<Record<string, Record<string, string | boolean>> | null>(null);
  const loadingRef = useRef(false);
  const lastBboxRef = useRef<string>('');
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mergeOverlayProps(features: GeoJSON.Feature[]): void {
    const cache = overlayCacheRef.current;
    if (!cache) return;
    for (const f of features) {
      const props = f.properties as Record<string, unknown> | null;
      if (!props || typeof props.id !== 'string') continue;
      Object.assign(props, cache[props.id] || {});
    }
  }

  function extractBounds(features: GeoJSON.Feature[]): maplibregl.LngLatBounds | null {
    try {
      const bounds = new maplibregl.LngLatBounds();
      let hasCoords = false;
      for (const f of features) {
        const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
        if (!g || !('coordinates' in (g as object))) continue;
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
        for (const poly of polys) {
          for (const ring of poly) {
            for (const coord of ring as unknown as number[][]) {
              if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') continue;
              bounds.extend(coord as [number, number]);
              hasCoords = true;
            }
          }
        }
      }
      return hasCoords ? bounds : null;
    } catch {
      return null;
    }
  }

  const loadParcels = useCallback(async (opts?: { bbox?: string; fit?: boolean }) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      let features: GeoJSON.Feature[] = [];

      if (!isSupabaseConfigured()) {
        // Demo data fallback
        let demoParcels = [...DEMO_PARCELS];
        if (filters.land_use) demoParcels = demoParcels.filter(p => p.landUse === filters.land_use);
        if (filters.verification_status) demoParcels = demoParcels.filter(p => p.dataQualityStatus === filters.verification_status);

        features = demoParcels.map(p => ({
          type: 'Feature' as const,
          id: p.id,
          properties: {
            id: p.id,
            ulpin: p.identity.ulpin,
            survey_number: p.identity.surveyNumber,
            subdivision_number: p.identity.subDivisionNumber || null,
            area: p.area,
            area_unit: p.areaUnit,
            land_use: p.landUse,
          },
          geometry: p.geometry as unknown as GeoJSON.Geometry,
        }));
      } else {
        // Supabase path
        let query = supabase.from('parcels').select(PARCEL_SELECT);

        if (filters.village_id) {
          query = query.eq('village_id', filters.village_id);
        } else if (filters.mandal_id) {
          query = query.eq('mandal_id', filters.mandal_id);
        } else if (filters.district_id) {
          query = query.eq('district_id', filters.district_id);
        } else if (filters.state_id) {
          query = query.eq('state_id', filters.state_id);
        }

        if (filters.land_use) {
          query = query.eq('land_use', filters.land_use);
        }
        if (filters.verification_status) {
          query = query.eq('verification_status', filters.verification_status);
        }

        // Viewport-based loading: only fetch parcels intersecting the visible
        // bounding box via the parcels_in_bbox RPC (uses the PostGIS GIST
        // spatial index server-side; plain PostgREST filters can't do this).
        if (opts?.bbox) {
          const [w, s, e, n] = opts.bbox.split(',').map(Number);
          if (![w, s, e, n].every(v => !isNaN(v))) return;
          const rpc = supabase.rpc as unknown as (
            fn: string,
            args: Record<string, number>
          ) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
          const { data: rpcData, error: rpcError } = await rpc('parcels_in_bbox', { w, s, e, n, max_rows: 2000 });
          if (rpcError) throw new Error(rpcError.message);
          if (!rpcData) return;
          features = rpcData.map((row) => ({
            type: 'Feature' as const,
            id: row.id as string,
            properties: {
              id: row.id as string,
              ulpin: row.ulpin as string | null,
              survey_number: row.survey_number as string,
              subdivision_number: row.subdivision_number as string | null,
              area: row.area as number,
              area_unit: row.area_unit as string,
              land_use: row.land_use as string,
            },
            geometry: row.geometry as GeoJSON.Geometry,
          }));
        } else {
          const { data, error: queryError } = await query.limit(2000);

          if (queryError) throw queryError;
          if (!data) return;

          features = data.map((row: Record<string, unknown>) => {
            return {
              type: 'Feature' as const,
              id: row.id as string,
              properties: {
                id: row.id as string,
                ulpin: row.ulpin as string | null,
                survey_number: row.survey_number as string,
                subdivision_number: row.subdivision_number as string | null,
                area: row.area as number,
                area_unit: row.area_unit as string,
                land_use: row.land_use as string,
              },
              geometry: row.geometry as GeoJSON.Geometry,
            };
          });
        }
      }

      if (!map.current) return;
      mergeOverlayProps(features);
      featuresRef.current = features;
      setParcelCount(features.length);

      if (process.env.NODE_ENV !== 'production' && features.length > 0) {
        const first = features[0];
        const g = first.geometry as { type?: string } | null;
        const props = first.properties as unknown as ParcelFeature;
        console.info(
          `[DharaniSetu] GIS: ${features.length} features, geometry=${g?.type || 'missing'}, first ULPIN=${props.ulpin || 'none'}`
        );
      }

      const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

      if (map.current.getSource('parcels-live')) {
        (map.current.getSource('parcels-live') as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource('parcels-live', { type: 'geojson', data: geojson });

        map.current.addLayer({
          id: 'parcels-fill',
          type: 'fill',
          source: 'parcels-live',
          paint: {
            'fill-color': ['match', ['get', 'land_use'],
              'residential', '#3b82f6',
              'commercial', '#f59e0b',
              'industrial', '#6b7280',
              'agricultural', '#10b981',
              'institutional', '#8b5cf6',
              'recreational', '#06b6d4',
              '#9ca3af'
            ],
            'fill-opacity': 0.3,
          },
        });

        map.current.addLayer({
          id: 'parcels-outline',
          type: 'line',
          source: 'parcels-live',
          paint: {
            'line-color': '#1e3a5f',
            'line-width': 1.5,
          },
        });

        map.current.addLayer({
          id: 'parcels-labels',
          type: 'symbol',
          source: 'parcels-live',
          minzoom: 12,
          layout: {
            'text-field': ['get', 'survey_number'],
            'text-size': 11,
            'text-offset': [0, 0],
            'visibility': 'visible',
          },
          paint: { 'text-color': '#1e3a5f' },
        });

        // Hover highlight (follows the pointer without refetching)
        map.current.addLayer({
          id: 'parcels-hover',
          type: 'line',
          source: 'parcels-live',
          paint: { 'line-color': '#1d4ed8', 'line-width': 3 },
          filter: ['==', ['get', 'id'], '__none__'],
        });

        // Selected parcel highlight (strong outline + tinted fill)
        map.current.addLayer({
          id: 'parcels-selected-fill',
          type: 'fill',
          source: 'parcels-live',
          paint: { 'fill-color': '#1d4ed8', 'fill-opacity': 0.25 },
          filter: ['==', ['get', 'id'], '__none__'],
        });

        map.current.addLayer({
          id: 'parcels-selected',
          type: 'line',
          source: 'parcels-live',
          paint: { 'line-color': '#1e40af', 'line-width': 4 },
          filter: ['==', ['get', 'id'], '__none__'],
        });

        let hoverRaf = 0;
        map.current.on('mousemove', 'parcels-fill', (e) => {
          if (!e.features || !e.features.length) return;
          const props = (e.features[0] as unknown as { properties: ParcelFeature }).properties;
          if (!props) return;
          const hoverId = props.id;
          cancelAnimationFrame(hoverRaf);
          hoverRaf = requestAnimationFrame(() => {
            try {
              if (map.current?.getLayer('parcels-hover')) {
                map.current.setFilter('parcels-hover', ['==', ['get', 'id'], hoverId]);
              }
            } catch { /* ignore */ }
          });
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('click', 'parcels-fill', (e) => {
          if (!e.features || !e.features.length) return;
          const props = (e.features[0] as unknown as { properties: ParcelFeature }).properties;
          if (!props || !props.id) return;
          selectParcelRef.current(props);
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseenter', 'parcels-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'parcels-fill', () => {
          try {
            if (map.current?.getLayer('parcels-hover')) {
              map.current.setFilter('parcels-hover', ['==', ['get', 'id'], '__none__']);
            }
          } catch { /* ignore */ }
          if (map.current) map.current.getCanvas().style.cursor = '';
        });

      updateSelectionFilter();
      // Deep link (?ulpin=...): focus + open the requested parcel once data arrives.
      if (pendingFocusRef.current && features.length > 0) {
        const u = pendingFocusRef.current;
        pendingFocusRef.current = null;
        void focusParcelByText(u);
      }
      }

      // Fit the map to loaded parcels only when requested (initial load,
      // filter change, reset) — never on viewport reloads.
      if (opts?.fit && features.length > 0 && map.current) {
        const bounds = extractBounds(features);
        if (bounds) {
          try {
            map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
          } catch { /* keep current viewport if bounds fail */ }
        }
      }
      updateSelectionFilter();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DharaniSetu] GIS load error:', msg, err instanceof Error ? err.stack : '');
      // Background viewport reloads must not wipe the map: only surface the
      // error banner when nothing has loaded successfully yet.
      if (featuresRef.current.length === 0) {
        setError(`${t.gis.loadError}: ${msg}`);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [filters, focusParcelByText]);

  // Local fallback basemap (no network needed): light backdrop so parcels stay visible
  // if the hosted style cannot be fetched.
  const FALLBACK_STYLE = {
    version: 8 as const,
    name: 'DharaniSetu local basemap',
    sources: {},
    layers: [
      { id: 'background', type: 'background' as const, paint: { 'background-color': '#e9eff5' } },
    ],
  };

  // Always call the latest loader without re-creating the map on filter changes
  const loadRef = useRef(loadParcels);
  loadRef.current = loadParcels;
  const fellBackRef = useRef(false);
  const mapLoadedRef2 = useRef(false);

  function applyFallbackStyle(reason: string): void {
    if (fellBackRef.current || !map.current) return;
    fellBackRef.current = true;
    console.info(`[DharaniSetu] GIS using local basemap (${reason})`);
    setMapLoaded(true);
    setLoading(false);
    mapLoadedRef2.current = true;
    try {
      map.current.setStyle(FALLBACK_STYLE as unknown as string);
      map.current.once('idle', () => {
        map.current?.resize();
        loadRef.current({ fit: true });
      });
    } catch { /* keep current style on failure */ }
  }

  useEffect(() => {
    if (mapLoaded) {
      lastBboxRef.current = '';
      loadRef.current({ fit: true });
    }
  }, [mapLoaded, loadParcels]);

  useEffect(() => {
    updateSelectionFilter();
  }, [updateSelectionFilter]);

  // Viewport-based reload: refetch visible parcels when the user pans/zooms.
  const mapLoadedRef = useRef(mapLoaded);
  mapLoadedRef.current = mapLoaded;
  const scheduleViewportReload = useCallback(() => {
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    moveTimerRef.current = setTimeout(() => {
      if (!map.current || !mapLoadedRef.current || loadingRef.current) return;
      try {
        const b = map.current.getBounds();
        const key = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => v.toFixed(4)).join(',');
        if (key === lastBboxRef.current) return;
        lastBboxRef.current = key;
        loadRef.current({ bbox: key, fit: false });
      } catch { /* ignore viewport errors */ }
    }, 500);
  }, []);
  const scheduleViewportReloadRef = useRef(scheduleViewportReload);
  scheduleViewportReloadRef.current = scheduleViewportReload;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.styleUrl,
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');
    (window as unknown as { __dsMap?: unknown }).__dsMap = map.current;
    map.current.on('moveend', () => {
      // Viewport reload (debounced); skip while the initial fit is in flight.
      scheduleViewportReloadRef.current();
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      setLoading(false);
      mapLoadedRef2.current = true;
      map.current?.resize();
      (window as unknown as { __dsMap?: unknown }).__dsMap = map.current;
      lastBboxRef.current = '';
      loadRef.current({ fit: true });
    });

    // If the hosted basemap style cannot load, fall back to a local backdrop
    // once so parcel boundaries remain visible.
    map.current.on('error', (e: { error?: { message?: string } }) => {
      if (fellBackRef.current || !map.current) return;
      const msg = e?.error?.message || '';
      if (msg.includes('style.json')) {
        applyFallbackStyle('hosted style failed to load');
      }
    });

    // Safety net: if neither load nor error fires (very slow/blocked network),
    // fall back to the local basemap so the map never stays blank.
    const fallbackTimer = setTimeout(() => {
      if (!mapLoadedRef2.current) applyFallbackStyle('style load timeout');
    }, 12000);

    return () => {
      clearTimeout(fallbackTimer);
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayLayersAddedRef = useRef(false);

  function refreshOverlaySource(): void {
    if (!map.current) return;
    try {
      const src = map.current.getSource('parcels-live') as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const features = featuresRef.current.map(f => ({
        ...f,
        properties: { ...(f.properties as Record<string, unknown>) },
      })) as GeoJSON.Feature[];
      mergeOverlayProps(features);
      src.setData({ type: 'FeatureCollection', features });
    } catch { /* ignore */ }
  }

  function addOverlayLayers(): void {
    if (!map.current || overlayLayersAddedRef.current) return;
    try {
      const m = map.current;
      if (!m.getSource('parcels-live')) return;
      const hidden = { visibility: 'none' as const };
      m.addLayer({
        id: 'parcels-zoning', type: 'fill', source: 'parcels-live',
        layout: hidden,
        paint: {
          'fill-color': ['match', ['get', 'zoning'],
            'residential', '#3b82f6', 'commercial', '#f59e0b', 'industrial', '#6b7280',
            'agricultural', '#10b981', 'institutional', '#8b5cf6', 'vacant', '#d1d5db',
            'rgba(0,0,0,0)'],
          'fill-opacity': 0.5,
        },
      });
      m.addLayer({
        id: 'parcels-tax', type: 'fill', source: 'parcels-live',
        layout: hidden,
        paint: {
          'fill-color': ['match', ['get', 'tax_status'],
            'current', '#10b981', 'arrears', '#ef4444', 'rgba(0,0,0,0)'],
          'fill-opacity': 0.45,
        },
      });
      m.addLayer({
        id: 'parcels-buildings', type: 'fill', source: 'parcels-live',
        layout: hidden,
        paint: {
          'fill-color': ['match', ['get', 'bld_status'],
            'approved', '#2563eb', 'pending', '#f59e0b', 'expired', '#9ca3af', 'rgba(0,0,0,0)'],
          'fill-opacity': 0.35,
        },
      });
      m.addLayer({
        id: 'parcels-restrictions', type: 'line', source: 'parcels-live',
        layout: { ...hidden, 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#dc2626', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
        filter: ['==', ['get', 'has_restr'], true],
      });
      m.addLayer({
        id: 'parcels-utilities', type: 'fill', source: 'parcels-live',
        layout: hidden,
        paint: {
          'fill-color': ['match', ['get', 'util_class'],
            'full', '#0d9488', 'partial', '#f59e0b', 'none', '#9ca3af', 'rgba(0,0,0,0)'],
          'fill-opacity': 0.4,
        },
      });
      overlayLayersAddedRef.current = true;
    } catch { /* ignore */ }
  }

  // Fetch small linkage datasets (one row per parcel max) and attach them as
  // feature properties so governance overlays render real database values.
  const ensureOverlayData = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    if (overlayCacheRef.current) {
      refreshOverlaySource();
      addOverlayLayers();
      return;
    }
    setOverlayLoading(true);
    try {
      const db = getSupabase();
      const [plan, tax, bld, rest, util] = await Promise.all([
        db.from('planning_records').select('parcel_id, zoning').limit(2000),
        db.from('property_tax_records').select('parcel_id, payment_status').limit(2000),
        db.from('building_permissions').select('parcel_id, approval_status').limit(2000),
        db.from('restrictions').select('parcel_id').limit(2000),
        db.from('utility_records').select('parcel_id, electricity, water, road_access').limit(2000),
      ]);
      const cache: Record<string, Record<string, string | boolean>> = {};
      const put = (pid: string, kv: Record<string, string | boolean>) => {
        if (!pid) return;
        cache[pid] = { ...(cache[pid] || {}), ...kv };
      };
      const empty: string[] = [];
      const planRows = (plan.data || []) as { parcel_id: string; zoning: string }[];
      const taxRows = (tax.data || []) as { parcel_id: string; payment_status: string }[];
      const bldRows = (bld.data || []) as { parcel_id: string; approval_status: string }[];
      const restRows = (rest.data || []) as { parcel_id: string }[];
      const utilRows = (util.data || []) as { parcel_id: string; electricity: boolean; water: boolean; road_access: boolean }[];
      if (!planRows.length) empty.push('zoning');
      else for (const r of planRows) put(r.parcel_id, { zoning: r.zoning });
      if (!taxRows.length) empty.push('property-tax');
      else for (const r of taxRows) put(r.parcel_id, { tax_status: r.payment_status });
      if (!bldRows.length) empty.push('building-permissions');
      else for (const r of bldRows) put(r.parcel_id, { bld_status: r.approval_status });
      if (!restRows.length) empty.push('restrictions');
      else for (const r of restRows) put(r.parcel_id, { has_restr: true });
      if (!utilRows.length) empty.push('utilities');
      else {
        for (const r of utilRows) {
          const on = [r.electricity, r.water, r.road_access].filter(Boolean).length;
          put(r.parcel_id, { util_class: on === 3 ? 'full' : on === 0 ? 'none' : 'partial' });
        }
      }
      overlayCacheRef.current = cache;
      setOverlayEmpty(empty);
      refreshOverlaySource();
      addOverlayLayers();
    } catch (err) {
      console.error('[DharaniSetu] GIS overlay error:', err instanceof Error ? err.message : err);
    } finally {
      setOverlayLoading(false);
    }
  }, []);

  const LAND_USE_MATCH: (string | maplibregl.ExpressionSpecification)[] = [
    'match', ['get', 'land_use'],
    'residential', '#3b82f6', 'commercial', '#f59e0b', 'industrial', '#6b7280',
    'agricultural', '#10b981', 'institutional', '#8b5cf6', 'recreational', '#06b6d4',
    '#9ca3af',
  ];
  const NEUTRAL_FILL = '#93c5fd';

  const applyLandUsePaint = (on: boolean) => {
    try {
      if (map.current?.getLayer('parcels-fill')) {
        map.current.setPaintProperty('parcels-fill', 'fill-color', on ? LAND_USE_MATCH : NEUTRAL_FILL);
      }
    } catch { /* ignore */ }
  };

  const resetView = useCallback(() => {
    if (!map.current || featuresRef.current.length === 0) return;
    const bounds = extractBounds(featuresRef.current);
    if (bounds) {
      try {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      } catch { /* ignore */ }
    }
  }, []);

  const locateSelected = useCallback(() => {
    if (!map.current || !selectedParcel) return;
    const found = featuresRef.current.find(f => (f.properties as { id?: string } | null)?.id === selectedParcel.id);
    if (found?.geometry) {
      const bounds = extractBounds([found]);
      if (bounds) {
        try {
          map.current.fitBounds(bounds, { padding: 120, maxZoom: 17 });
          return;
        } catch { /* ignore */ }
      }
    }
    // Selected parcel not in the current viewport data — fetch and fly to it.
    void (async () => {
      const { data } = await getSupabase().from('parcels').select('geometry').eq('id', selectedParcel.id).single();
      const row = data as unknown as { geometry?: GeoJSON.Geometry } | null;
      if (row?.geometry && map.current) {
        const bounds = extractBounds([{ type: 'Feature', id: selectedParcel.id, properties: {}, geometry: row.geometry } as GeoJSON.Feature]);
        if (bounds) {
          try {
            map.current.fitBounds(bounds, { padding: 120, maxZoom: 17 });
          } catch { /* ignore */ }
        }
      }
    })();
  }, [selectedParcel]);

  const toggleLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.available) return;
    const next = !layer.active;
    setLayers(layers.map(l => (l.id === layerId ? { ...l, active: next } : l)));
    if (!map.current) return;
    const vis = next ? 'visible' : 'none';
    const setVis = (id: string) => {
      try {
        if (map.current?.getLayer(id)) map.current.setLayoutProperty(id, 'visibility', vis);
      } catch { /* ignore */ }
    };
    if (!isSupabaseConfigured()) {
      // Demo mode: only base parcels + labels toggles apply.
      if (layerId === 'parcels') { setVis('parcels-fill'); setVis('parcels-outline'); }
      if (layerId === 'labels') setVis('parcels-labels');
      return;
    }
    switch (layerId) {
      case 'parcels':
        setVis('parcels-fill');
        setVis('parcels-outline');
        break;
      case 'labels':
        setVis('parcels-labels');
        break;
      case 'land-use':
        applyLandUsePaint(next);
        break;
      case 'zoning':
        void ensureOverlayData().then(() => setVis('parcels-zoning'));
        break;
      case 'property-tax':
        void ensureOverlayData().then(() => setVis('parcels-tax'));
        break;
      case 'building-permissions':
        void ensureOverlayData().then(() => setVis('parcels-buildings'));
        break;
      case 'restrictions':
        void ensureOverlayData().then(() => setVis('parcels-restrictions'));
        break;
      case 'utilities':
        void ensureOverlayData().then(() => setVis('parcels-utilities'));
        break;
      default:
        break;
    }
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      state_id: '',
      district_id: '',
      mandal_id: '',
      village_id: '',
      land_use: '',
      verification_status: '',
    });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const categories = ['base', 'governance', 'infrastructure', 'administrative'] as const;

  const renderFilterDropdown = (
    label: string,
    allLabel: string,
    value: string,
    options: Option[],
    disabled: boolean,
    onChange: (val: string) => void
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">{allLabel}</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.gis.title}</h1>
            <p className="text-sm text-gray-500">
              {loading ? t.gis.loadingData : `${parcelCount} ${t.gis.loadedSuffix}${activeFilterCount > 0 ? ` (${t.gis.filtered})` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DataDisclaimer />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-170px)] lg:overflow-hidden">
        <aside className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 overflow-y-auto max-h-[calc(100vh-120px)] order-2 lg:order-1">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.gis.findParcel}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void focusParcelByText(mapSearch);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                placeholder={t.gis.findPlaceholder}
                aria-label={t.gis.findParcel}
                className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={mapSearching || !mapSearch.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
              >
                {mapSearching ? '…' : t.common.go}
              </button>
            </form>
            {mapSearchResults.length > 1 && (
              <div className="mt-2 space-y-1">
                {mapSearchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => void focusParcelByText(r.ulpin || r.survey_number)}
                    className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-blue-50 text-gray-700"
                  >
                    <span className="font-mono">{r.ulpin || t.gis.ulpin}</span>
                    <span className="text-gray-400"> · {r.survey_number}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mb-6">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center justify-between w-full text-sm font-semibold text-gray-900 mb-2"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {t.gis.filters}
                {activeFilterCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <svg className={`w-4 h-4 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFilterPanel && (
              <div className="space-y-3 mt-2">
                {renderFilterDropdown(t.gis.state, t.search.allStates, filters.state_id, states, false, (val) => updateFilter('state_id', val))}
                {renderFilterDropdown(t.gis.district, t.search.allDistricts, filters.district_id, districts, !filters.state_id, (val) => updateFilter('district_id', val))}
                {renderFilterDropdown(t.gis.mandal, t.search.allMandals, filters.mandal_id, mandals, !filters.district_id, (val) => updateFilter('mandal_id', val))}
                {renderFilterDropdown(t.gis.village, t.search.allVillages, filters.village_id, villages, !filters.mandal_id, (val) => updateFilter('village_id', val))}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.gis.landUse}</label>
                  <select
                    value={filters.land_use}
                    onChange={(e) => updateFilter('land_use', e.target.value)}
                    aria-label={t.gis.landUse}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t.gis.allLandUse}</option>
                    {LAND_USE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t.gis.verificationStatus}</label>
                  <select
                    value={filters.verification_status}
                    onChange={(e) => updateFilter('verification_status', e.target.value)}
                    aria-label={t.gis.verificationStatus}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t.gis.allStatuses}</option>
                    {VERIFICATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="w-full text-xs font-medium text-blue-600 hover:text-blue-700 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {t.gis.clearFilters}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.gis.mapLayers}</h3>
            {categories.map((cat) => {
              const catLayers = getLayersByCategory(cat);
              return (
                <div key={cat} className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t.gis[CATEGORY_LABELS[cat]]}</h4>
                  <div className="space-y-1">
                    {catLayers.map((layer) => {
                      const state = layers.find(l => l.id === layer.id);
                      const isActive = state?.active ?? layer.active;
                      const isAvailable = layer.available;
                      return (
                        <div key={layer.id} className="relative group">
                          <label
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                              isAvailable ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => isAvailable && toggleLayer(layer.id)}
                              disabled={!isAvailable}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700 block truncate">{layerLabel(layer.id, t)}</span>
                              {overlayEmpty.includes(layer.id) && (
                                <span className="text-xs text-gray-400 block">{t.gis.noRecords}</span>
                              )}
                            </div>
                            {!isAvailable && (
                              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                          </label>
                          {!isAvailable && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              {layer.available ? layer.description : t.gis.noSpatialData}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.gis.legend}</h3>
            <div className="space-y-2">
              {Object.entries(LAND_USE_COLORS).filter(([k]) => ['residential','commercial','industrial','agricultural','institutional'].includes(k)).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600 capitalize">{key}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.gis.dataSources}</h3>
            <div className="space-y-2">
              <DataSourceBadge source={{ id: '1', name: 'Revenue Department Records', type: 'REAL_OFFICIAL', department: 'Revenue', lastUpdated: '2026-03-15', status: 'active' }} compact />
              <DataSourceBadge source={{ id: '2', name: 'Cadastral Map Data (Demonstration)', type: 'DEMONSTRATION', department: 'Survey', lastUpdated: '2026-09-01', status: 'active' }} compact />
              <DataSourceBadge source={{ id: '3', name: 'OpenStreetMap', type: 'EXTERNAL_OPEN_DATA', department: 'External', lastUpdated: '2026-09-01', status: 'active' }} compact />
            </div>
          </div>
        </aside>

        <div className="flex-1 relative order-1 lg:order-2 h-[70vh] min-h-[480px] lg:h-auto lg:min-h-0">
          <div ref={mapContainer} className="block w-full h-[70vh] min-h-[480px] lg:h-full lg:min-h-0" role="application" aria-label={t.gis.title} />

          {(!mapLoaded || loading) && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-[1]">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-3 text-sm text-gray-600">{loading ? t.gis.loadingData : t.gis.loadingMap}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-4 bg-red-50 border border-red-200 rounded-lg p-3 z-[2]">
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => { setError(null); loadParcels(); }} className="text-xs text-red-600 underline mt-1">{t.gis.retry}</button>
            </div>
          )}

          {/* Map controls: reset view + locate selected parcel */}
          <div className="absolute top-4 right-14 z-[2] flex flex-col gap-2">
            <button
              onClick={resetView}
              title={t.common.resetView}
              aria-label={t.common.resetView}
              className="w-9 h-9 rounded-lg bg-white border border-gray-200 shadow text-gray-700 hover:bg-gray-50 text-base font-bold"
            >
              ⤾
            </button>
            {selectedParcel && (
              <button
                onClick={locateSelected}
                title={t.common.zoomToParcel}
                aria-label={t.common.zoomToParcel}
                className="w-9 h-9 rounded-lg bg-white border border-gray-200 shadow text-gray-700 hover:bg-gray-50 text-base"
              >
                ◎
              </button>
            )}
          </div>

          {selectedParcel && (
            <DetailPanel
              light={selectedParcel}
              detail={selectedDetail}
              loading={detailLoading}
              error={detailError}
              onClose={() => {
                setSelectedParcel(null);
                setSelectedDetail(null);
                setDetailError(null);
              }}
              onLocate={locateSelected}
            />
          )}

          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-600 border border-gray-200 z-[1]">
            {parcelCount} {t.gis.clickHint}
          </div>
        </div>
      </div>
    </div>
  );
}
