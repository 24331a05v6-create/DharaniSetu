'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { DataSourceBadge, DataSourcePanel, DataDisclaimer } from '@/components/common/DataSourceBadge';
import { StatusIndicator, SectionCard, getDataQualityColor } from '@/components/common/StatusIndicator';
import { DataSourceType } from '@/types/parcel';
import { getDemoUnifiedProfile } from '@/services/mockData';
import { useLanguage } from '@/i18n';

interface ProfileData {
  parcel: {
    id: string; ulpin: string | null; survey_number: string; subdivision_number: string | null;
    parcel_reference: string | null; area: number; area_unit: string; land_use: string;
    land_classification: string | null; data_status: string;     verification_status: string;
    last_verified_at: string | null;
    created_at: string; geometry: unknown;
    village: { name: string; code: string; ward: string | null; local_body?: string | null };
    mandal: { name: string; code: string };
    district: { name: string; code: string };
    state: { name: string; code: string };
    source: { id: string; name: string; department: string; source_type: string } | null;
  };
  rights: Record<string, unknown>[];
  registrations: Record<string, unknown>[];
  encumbrances: Record<string, unknown>[];
  planning: Record<string, unknown> | null;
  building_permissions: Record<string, unknown>[];
  tax: Record<string, unknown> | null;
  utilities: Record<string, unknown> | null;
  restrictions: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  history: Record<string, unknown>[];
}

const PARCEL_SELECT = `
  id, ulpin, survey_number, subdivision_number, parcel_reference,
  area, area_unit, land_use, land_classification, data_status,
  verification_status, last_verified_at, created_at, geometry,
  village:villages!inner(name, code, ward, local_body),
  mandal:mandals!inner(name, code),
  district:districts!inner(name, code),
  state:states!inner(name, code),
  source:data_sources(id, name, department, source_type)
`;

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'string' && val.trim() === '') return 'N/A';
  return String(val);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return dateStr; }
}

function ParcelProfileContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const ulpin = searchParams.get('ulpin') || searchParams.get('id') || '';
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<{
    completeness: number;
    completenessLabel: string;
    consistencyStatus: 'Consistent' | 'Conflicting' | 'Needs Review';
    sourceCoverage: { domain: string; available: boolean }[];
  } | null>(null);

  useEffect(() => {
    if (!ulpin) { setLoading(false); setError(t.profile.noParcelId); return; }
    let cancelled = false;
    async function load() {
      try {
        // Demo data fallback when Supabase is not configured
        if (!isSupabaseConfigured()) {
          const demoProfile = getDemoUnifiedProfile(ulpin);
          if (!demoProfile || cancelled) {
            if (!cancelled) { setError(`${t.profile.notFound}: ${ulpin}`); setLoading(false); }
            return;
          }
          const p = demoProfile.parcel;
          const profileData: ProfileData = {
            parcel: {
              id: p.id, ulpin: p.identity.ulpin, survey_number: p.identity.surveyNumber,
              subdivision_number: p.identity.subDivisionNumber || null, parcel_reference: p.sourceRecordId || null,
              area: p.area, area_unit: p.areaUnit, land_use: p.landUse,
              land_classification: p.landClassification, data_status: p.dataQualityStatus,
              verification_status: p.dataQualityStatus, last_verified_at: null, created_at: p.createdAt, geometry: p.geometry as unknown,
              village: { name: p.identity.hierarchy.village, code: p.identity.hierarchy.villageCode, ward: null },
              mandal: { name: p.identity.hierarchy.mandal, code: p.identity.hierarchy.mandalCode },
              district: { name: p.identity.hierarchy.district, code: p.identity.hierarchy.districtCode },
              state: { name: p.identity.hierarchy.state, code: p.identity.hierarchy.stateCode },
              source: { id: p.source.id, name: p.source.name, department: p.source.department, source_type: p.source.type },
            },
            rights: demoProfile.rights as unknown as Record<string, unknown>[],
            registrations: demoProfile.registrations as unknown as Record<string, unknown>[],
            encumbrances: demoProfile.encumbrances as unknown as Record<string, unknown>[],
            planning: demoProfile.planning as unknown as Record<string, unknown> | null,
            building_permissions: [],
            tax: demoProfile.tax as unknown as Record<string, unknown> | null,
            utilities: demoProfile.utilities as unknown as Record<string, unknown> | null,
            restrictions: demoProfile.restrictions as unknown as Record<string, unknown>[],
            documents: demoProfile.documents as unknown as Record<string, unknown>[],
            history: demoProfile.history as unknown as Record<string, unknown>[],
          };
          if (!cancelled) setProfile(profileData);
          return;
        }

        // Supabase path
        const supabase = getSupabase();
        const { data: parcel, error: pErr } = await supabase
          .from('parcels').select(PARCEL_SELECT)
          .eq('ulpin', ulpin).single();
        if (pErr || !parcel) { if (!cancelled) { setError(`${t.profile.notFound}: ${ulpin}`); setLoading(false); } return; }
        const r = parcel as Record<string, unknown>;
        const parcelId = r.id as string;
        const [rightsRes, regRes, encRes, planRes, bpRes, taxRes, utilRes, restRes, docRes, histRes] = await Promise.all([
          supabase.from('rights_records').select('*').eq('parcel_id', parcelId).order('created_at', { ascending: false }),
          supabase.from('registration_records').select('*').eq('parcel_id', parcelId).order('registration_date', { ascending: false }),
          supabase.from('encumbrances').select('*').eq('parcel_id', parcelId).order('created_at', { ascending: false }),
          supabase.from('planning_records').select('*').eq('parcel_id', parcelId).order('created_at', { ascending: false }).maybeSingle(),
          supabase.from('building_permissions').select('*').eq('parcel_id', parcelId).order('created_at', { ascending: false }),
          supabase.from('property_tax_records').select('*').eq('parcel_id', parcelId).order('assessment_year', { ascending: false }).maybeSingle(),
          supabase.from('utility_records').select('*').eq('parcel_id', parcelId).maybeSingle(),
          supabase.from('restrictions').select('*').eq('parcel_id', parcelId).order('created_at', { ascending: false }),
          supabase.from('parcel_documents').select('*').eq('parcel_id', parcelId).order('created_at', { ascending: false }),
          supabase.from('parcel_history').select('*').eq('parcel_id', parcelId).order('event_date', { ascending: false }),
        ]);
        if (cancelled) return;
        const village = r.village as Record<string, unknown>;
        const mandal = r.mandal as Record<string, unknown>;
        const district = r.district as Record<string, unknown>;
        const state = r.state as Record<string, unknown>;
        const source = r.source as Record<string, unknown> | null;
        const profileData: ProfileData = {
          parcel: {
            id: r.id as string, ulpin: r.ulpin as string | null, survey_number: r.survey_number as string,
            subdivision_number: r.subdivision_number as string | null, parcel_reference: r.parcel_reference as string | null,
            area: r.area as number, area_unit: r.area_unit as string, land_use: r.land_use as string,
            land_classification: r.land_classification as string | null, data_status: r.data_status as string,
            verification_status: r.verification_status as string, last_verified_at: (r.last_verified_at as string) || null, created_at: r.created_at as string, geometry: r.geometry,
            village: { name: village.name as string, code: village.code as string, ward: village.ward as string | null, local_body: village.local_body as string | null },
            mandal: { name: mandal.name as string, code: mandal.code as string },
            district: { name: district.name as string, code: district.code as string },
            state: { name: state.name as string, code: state.code as string },
            source: source ? { id: source.id as string, name: source.name as string, department: source.department as string, source_type: source.source_type as string } : null,
          },
          rights: rightsRes.data || [], registrations: regRes.data || [], encumbrances: encRes.data || [],
          planning: planRes.data, building_permissions: bpRes.data || [], tax: taxRes.data,
          utilities: utilRes.data, restrictions: restRes.data || [], documents: docRes.data || [], history: histRes.data || [],
        };
        setProfile(profileData);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load parcel profile';
          console.error('[DharaniSetu] Profile error:', msg);
          setError(msg);
        }
      }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [ulpin]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    async function loadIntelligence() {
      try {
        if (!profile) return;
        // Reuse the already-loaded related records (no duplicate queries).
        const hasRights = profile.rights.length > 0 ? 1 : 0;
        const hasReg = profile.registrations.length > 0 ? 1 : 0;
        const hasPlan = profile.planning ? 1 : 0;
        const hasTax = profile.tax ? 1 : 0;
        const hasUtil = profile.utilities ? 1 : 0;
        const hasRest = profile.restrictions.length > 0 ? 1 : 0;
        // Only new query: open data conflicts for consistency status.
        const supabase = getSupabase();
        const { data: conflicts } = await supabase
          .from('data_conflicts').select('id').eq('parcel_id', profile.parcel.id).eq('status', 'open').limit(1);
        if (cancelled) return;
        const p = profile.parcel;
        const fields = [p.ulpin, p.area, p.land_use, p.land_classification, p.subdivision_number, p.parcel_reference];
        const filledFields = fields.filter(f => f !== null && f !== undefined && f !== '').length;
        const verifiedBonus = p.verification_status === 'verified' ? 1 : 0;
        const totalChecks = fields.length + 3;
        const filled = filledFields + verifiedBonus + hasRights + hasPlan;
        const completeness = Math.round((filled / totalChecks) * 100);
        const completenessLabel = completeness >= 80 ? 'Complete' : completeness >= 50 ? 'Partially Complete' : 'Missing Information';
        const hasConflicts = (conflicts?.length ?? 0) > 0;
        const domainsCovered = [hasRights, hasReg, hasPlan, hasTax, hasUtil, hasRest].filter(Boolean).length;
        let consistencyStatus: 'Consistent' | 'Conflicting' | 'Needs Review' = 'Needs Review';
        if (hasConflicts) consistencyStatus = 'Conflicting';
        else if (p.verification_status === 'verified' && domainsCovered >= 3) consistencyStatus = 'Consistent';
        const sourceCoverage = [
          { domain: 'Rights', available: hasRights > 0 },
          { domain: 'Registration', available: hasReg > 0 },
          { domain: 'Planning', available: hasPlan > 0 },
          { domain: 'Tax', available: hasTax > 0 },
          { domain: 'Utilities', available: hasUtil > 0 },
          { domain: 'Restrictions', available: hasRest > 0 },
        ];
        if (!cancelled) setIntelligence({ completeness, completenessLabel, consistencyStatus, sourceCoverage });
      } catch { /* ignore intelligence errors */ }
    }
    loadIntelligence();
    return () => { cancelled = true; };
  }, [profile]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-gray-600">{t.common.loading}</p>
      </div>
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">{t.profile.notFound}</h2>
        <p className="mt-2 text-gray-600">{error || t.profile.notFound}</p>
        <Link href="/search" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium">{t.common.back} · {t.nav.searchParcel}</Link>
      </div>
    </div>
  );

  const { parcel, rights, registrations, encumbrances, planning, building_permissions, tax, utilities, restrictions, documents, history } = profile;

  const dataSourceMap: Record<string, { id: string; name: string; type: DataSourceType; department: string; lastUpdated: string; status: 'active' }> = {
    REAL_OFFICIAL: { id: 'revenue-official', name: 'Revenue Department Records', type: 'REAL_OFFICIAL', department: 'Revenue', lastUpdated: '2026-03-15', status: 'active' },
    DEMONSTRATION: { id: 'cadastral-mock', name: 'Cadastral Map Data (Demonstration)', type: 'DEMONSTRATION', department: 'Survey & Land Records', lastUpdated: '2026-09-01', status: 'active' },
    EXTERNAL_OPEN_DATA: { id: 'osm-external', name: 'OpenStreetMap', type: 'EXTERNAL_OPEN_DATA', department: 'External', lastUpdated: '2026-09-01', status: 'active' },
    OPEN_DATA: { id: 'ap-open-data', name: 'AP Open Data', type: 'OPEN_DATA', department: 'Survey & Land Records', lastUpdated: '2026-09-01', status: 'active' },
  };

  const parcelSource = parcel.source;
  const sourceType = parcelSource?.source_type || 'DEMONSTRATION';
  const sourceBadge = dataSourceMap[sourceType] || dataSourceMap.DEMONSTRATION;

  const ulpinDisplay = parcel.ulpin
    ? { label: parcel.ulpin, type: sourceType === 'REAL_OFFICIAL' || sourceType === 'OPEN_DATA' ? 'Official' : 'Internal', badge: sourceType === 'REAL_OFFICIAL' || sourceType === 'OPEN_DATA' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700' }
    : { label: 'Not assigned', type: 'None', badge: 'bg-gray-100 text-gray-500' };

  const confidenceDisplay = parcel.verification_status === 'verified'
    ? { label: 'Verified', color: 'bg-emerald-100 text-emerald-700', icon: 'check' }
    : parcel.verification_status === 'pending'
    ? { label: 'Needs Review', color: 'bg-amber-100 text-amber-700', icon: 'warning' }
    : parcel.verification_status === 'rejected'
    ? { label: 'Conflicting Data', color: 'bg-red-100 text-red-700', icon: 'error' }
    : { label: 'Unverified', color: 'bg-gray-100 text-gray-600', icon: 'info' };

  const geo = parcel.geometry as Record<string, unknown> | null;
  let centroidText = 'N/A';
  if (geo) {
    try {
      const coords = (geo as Record<string, unknown>).coordinates as number[][][];
      if (coords && coords[0] && coords[0][0]) centroidText = `${coords[0][0][1].toFixed(4)}, ${coords[0][0][0].toFixed(4)}`;
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">{t.nav.home}</Link><span>/</span>
            <Link href="/search" className="hover:text-gray-700">{t.nav.searchParcel}</Link><span>/</span>
            <span className="text-gray-900 font-medium">{t.profile.breadcrumb}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            <strong>Information Notice:</strong> This parcel profile aggregates data from multiple government and open data sources.
            DharaniSetu is an integrated information system and does not itself establish legal title or ownership.
            Verified information has been reviewed by authorized officers. Demonstration data is clearly labeled.
            Always consult official government records for legal purposes.
          </p>
        </div>

        {intelligence && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                {t.profile.breadcrumb} · Intelligence
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.profile.completeness}</h3>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">{intelligence.completeness}%</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded mb-1 ${
                      intelligence.completeness >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      intelligence.completeness >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{intelligence.completenessLabel}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        intelligence.completeness >= 80 ? 'bg-emerald-500' :
                        intelligence.completeness >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${intelligence.completeness}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.profile.consistency}</h3>
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      intelligence.consistencyStatus === 'Consistent' ? 'bg-emerald-100' :
                      intelligence.consistencyStatus === 'Conflicting' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      {intelligence.consistencyStatus === 'Consistent' && (
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      )}
                      {intelligence.consistencyStatus === 'Conflicting' && (
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                      {intelligence.consistencyStatus === 'Needs Review' && (
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
                      )}
                    </span>
                    <span className={`text-sm font-semibold ${
                      intelligence.consistencyStatus === 'Consistent' ? 'text-emerald-700' :
                      intelligence.consistencyStatus === 'Conflicting' ? 'text-red-700' : 'text-amber-700'
                    }`}>{intelligence.consistencyStatus}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.profile.coverage}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {intelligence.sourceCoverage.map(s => (
                      <div key={s.domain} className="flex items-center gap-2">
                        {s.available ? (
                          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                        <span className={`text-xs ${s.available ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{s.domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-900 text-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold">{parcel.survey_number}</h1>
                  {parcel.subdivision_number && <span className="text-blue-300">/{parcel.subdivision_number}</span>}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${confidenceDisplay.color}`}>
                    {confidenceDisplay.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-blue-200 text-sm">
                    ULPIN: <span className={`font-mono px-1.5 py-0.5 rounded ${ulpinDisplay.badge}`}>{ulpinDisplay.label}</span>
                    {ulpinDisplay.type !== 'None' && <span className="text-blue-300 text-xs ml-1">({ulpinDisplay.type})</span>}
                  </p>
                  {parcel.parcel_reference && (
                    <p className="text-blue-200 text-sm">Ref: <span className="font-mono">{parcel.parcel_reference}</span></p>
                  )}
                </div>
              </div>
              <DataSourceBadge source={sourceBadge} compact />
              <div className="flex gap-2">
                {parcel.ulpin && (
                <Link
                  href={`/gis-explorer?ulpin=${encodeURIComponent(parcel.ulpin)}`}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
                >
                  {t.profile.viewOnMap}
                </Link>
                )}
                <Link
                  href={`/services?ulpin=${encodeURIComponent(parcel.ulpin || '')}`}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
                >
                  {t.profile.services}
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div><p className="text-xs text-gray-500">{t.profile.village}</p><p className="text-sm font-medium text-gray-900">{parcel.village.name}</p></div>
              <div><p className="text-xs text-gray-500">{t.profile.mandal}</p><p className="text-sm font-medium text-gray-900">{parcel.mandal.name}</p></div>
              <div><p className="text-xs text-gray-500">{t.profile.district}</p><p className="text-sm font-medium text-gray-900">{parcel.district.name}</p></div>
              <div><p className="text-xs text-gray-500">{t.profile.state}</p><p className="text-sm font-medium text-gray-900">{parcel.state.name}</p></div>
              <div><p className="text-xs text-gray-500">Ward / Local body</p><p className="text-sm font-medium text-gray-900">{parcel.village.ward || parcel.village.local_body || 'Not recorded'}</p></div>
              <div><p className="text-xs text-gray-500">Last verified</p><p className="text-sm font-medium text-gray-900">{parcel.last_verified_at ? formatDate(parcel.last_verified_at) : 'Not recorded'}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">{t.profile.source}</p><p className="text-sm font-medium text-gray-900">{parcel.source ? `${parcel.source.name} (${parcel.source.department})` : 'Not recorded'}</p></div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.profile.quickStatus}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <StatusIndicator label={t.profile.owner} status={rights.length > 0 ? 'available' : 'info'} value={rights.length > 0 ? String((rights[0] as Record<string, unknown>).rights_holder_name || 'Record exists') : 'No record available'} />
                <StatusIndicator label={t.profile.registrationLabel} status={registrations.length > 0 ? 'registered' : 'info'} value={registrations.length > 0 ? `Doc: ${String((registrations[0] as Record<string, unknown>).document_number || '').slice(-8)}` : 'No record available'} />
                <StatusIndicator label={t.profile.encumbranceLabel} status={encumbrances.length > 0 ? 'warning' : 'info'} value={encumbrances.length > 0 ? String((encumbrances[0] as Record<string, unknown>).status || 'Check Required') : 'No record available'} />
                <StatusIndicator label={t.profile.landUseLabel} status="info" value={parcel.land_use.charAt(0).toUpperCase() + parcel.land_use.slice(1)} />
                <StatusIndicator label={t.profile.taxLabel} status={tax ? 'available' : 'info'} value={tax ? String((tax as Record<string, unknown>).payment_status || 'Record exists') : 'No record available'} />
                <StatusIndicator label={t.profile.restrictionLabel} status={restrictions.length === 0 ? 'info' : 'warning'} value={restrictions.length === 0 ? 'No record available' : `${restrictions.length} found`} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title={t.profile.parcelLocation} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" /></svg>}>
              {geo ? (
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" /></svg>
                    <p className="mt-2 text-sm text-gray-500">Parcel geometry loaded from PostGIS</p>
                    <p className="text-xs text-gray-400 mt-1">Centroid: {centroidText}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <p className="text-sm text-gray-500">No geometry data available</p>
                </div>
              )}
            </SectionCard>

            <SectionCard title={t.profile.overview} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">{t.profile.area}</p><p className="text-sm font-medium text-gray-900">{parcel.area} {parcel.area_unit}</p></div>
                <div><p className="text-xs text-gray-500">{t.profile.classification}</p><p className="text-sm font-medium text-gray-900">{formatValue(parcel.land_classification)}</p></div>
                <div><p className="text-xs text-gray-500">{t.profile.landUse}</p><p className="text-sm font-medium text-gray-900 capitalize">{parcel.land_use}</p></div>
                <div><p className="text-xs text-gray-500">{t.profile.surveyNumber}</p><p className="text-sm font-medium text-gray-900">{parcel.survey_number}</p></div>
              </div>
            </SectionCard>

            <SectionCard title={t.profile.ownership} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}>
              {rights.length > 0 ? (
                <div className="space-y-3">
                  {rights.map((r) => {
                    const rec = r as Record<string, unknown>;
                    return (
                      <div key={rec.id as string} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatValue(rec.rights_holder_name)}</p>
                          <p className="text-xs text-gray-500">{formatValue(rec.right_type)} - {formatValue(rec.extent)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.possession_status === 'in_possession' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {formatValue(rec.possession_status).replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-gray-500">No record available</p>}
            </SectionCard>

            <SectionCard title={t.profile.registration} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}>
              {registrations.length > 0 ? (
                <div className="space-y-3">
                  {registrations.map((r) => {
                    const rec = r as Record<string, unknown>;
                    return (
                      <div key={rec.id as string} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formatValue(rec.document_number)}</p>
                            <p className="text-xs text-gray-500">{formatValue(rec.transaction_type)} - {formatDate(rec.registration_date as string)}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.transaction_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {formatValue(rec.transaction_status)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-gray-500">No record available</p>}
            </SectionCard>

            <SectionCard title={t.profile.encumbrance} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}>
              {encumbrances.length > 0 ? (
                <div className="space-y-3">
                  {encumbrances.map((r) => {
                    const rec = r as Record<string, unknown>;
                    return (
                      <div key={rec.id as string} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formatValue(rec.encumbrance_type)}</p>
                            <p className="text-xs text-gray-500">Since: {formatDate(rec.start_date as string)}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.status === 'released' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {formatValue(rec.status)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-gray-500">No record available</p>}
            </SectionCard>

            {planning && (
              <SectionCard title={t.profile.planning} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /></svg>}>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500">Zoning</p><p className="text-sm font-medium text-gray-900 capitalize">{formatValue(planning.zoning)}</p></div>
                  <div><p className="text-xs text-gray-500">Permitted Use</p><p className="text-sm font-medium text-gray-900">{formatValue(planning.permitted_land_use)}</p></div>
                  <div><p className="text-xs text-gray-500">Authority</p><p className="text-sm font-medium text-gray-900">{formatValue(planning.planning_authority)}</p></div>
                  <div><p className="text-xs text-gray-500">Road Reservation</p><p className="text-sm font-medium text-gray-900">{planning.road_reservation ? 'Yes' : 'No'}</p></div>
                </div>
              </SectionCard>
            )}

            {building_permissions.length > 0 ? (
              <SectionCard title={t.profile.building} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008z" /></svg>}>
                <div className="space-y-3">
                  {building_permissions.map((b) => {
                    const rec = b as Record<string, unknown>;
                    return (
                      <div key={rec.id as string} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{formatValue(rec.permission_number)} <span className="font-normal text-gray-500 capitalize">({formatValue(rec.approval_status)})</span></p>
                        <p className="text-xs text-gray-500 mt-1">Use: {formatValue(rec.building_use)} · Floors: {formatValue(rec.permitted_floors)} · Date: {formatValue(rec.approval_date)}</p>
                        <p className="text-xs text-gray-500">Authority: {formatValue(rec.authority)}</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            ) : null}

            {tax && (
              <SectionCard title={t.profile.tax} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>}>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500">Assessment Year</p><p className="text-sm font-medium text-gray-900">{formatValue(tax.assessment_year)}</p></div>
                  <div><p className="text-xs text-gray-500">Assessed Value</p><p className="text-sm font-medium text-gray-900">{tax.assessed_value ? `₹${Number(tax.assessed_value).toLocaleString()}` : 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-500">Tax Amount</p><p className="text-sm font-medium text-gray-900">{tax.tax_amount ? `₹${Number(tax.tax_amount).toLocaleString()}` : 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-500">Payment Status</p><p className="text-sm font-medium text-gray-900 capitalize">{formatValue(tax.payment_status)}</p></div>
                </div>
              </SectionCard>
            )}

            {utilities && (
              <SectionCard title={t.profile.utilities} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Electricity', val: utilities.electricity },
                    { label: 'Water', val: utilities.water },
                    { label: 'Drainage', val: utilities.drainage },
                    { label: 'Road Access', val: utilities.road_access },
                  ].map((u) => (
                    <div key={u.label} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className={`w-2 h-2 rounded-full ${u.val ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">{u.label}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title={t.profile.restrictions} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}>
              {restrictions.length > 0 ? (
                <div className="space-y-2">
                  {restrictions.map((r) => {
                    const rec = r as Record<string, unknown>;
                    return (
                      <div key={rec.id as string} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm font-medium text-amber-800">{formatValue(rec.restriction_type)}</p>
                        <p className="text-xs text-amber-600 mt-1">{formatValue(rec.description)}</p>
                        <p className="text-xs text-amber-500 mt-1">Authority: {formatValue(rec.authority)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-gray-500">No record available</p>}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <DataSourcePanel
              sources={[
                { id: 'revenue', name: 'Revenue Department', type: 'REAL_OFFICIAL', department: 'Revenue', lastUpdated: '2026-03-15', status: 'active' },
                { id: 'registration', name: 'Registration Department', type: 'REAL_OFFICIAL', department: 'Registration', lastUpdated: '2026-03-10', status: 'active' },
                { id: 'cadastral', name: 'Cadastral Map (Demo)', type: 'DEMONSTRATION', department: 'Survey', lastUpdated: '2026-09-01', status: 'active' },
              ]}
              title={t.profile.dataSources}
            />

            <DataDisclaimer variant="banner" />

            <SectionCard title={t.profile.documents} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}>
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((d) => {
                    const doc = d as Record<string, unknown>;
                    return (
                      <div key={doc.id as string} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{formatValue(doc.document_type)}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatValue(doc.document_number)}</p>
                        <p className="text-xs text-gray-500">{formatValue(doc.issuing_authority)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-gray-500">No record available</p>}
            </SectionCard>

            <SectionCard title={t.profile.history} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((h) => {
                    const evt = h as Record<string, unknown>;
                    return (
                      <div key={evt.id as string} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatValue(evt.event_type)}</p>
                          <p className="text-xs text-gray-500">{formatDate(evt.event_date as string)}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{formatValue(evt.description)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-gray-500">No record available</p>}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParcelProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ParcelProfileContent />
    </Suspense>
  );
}
