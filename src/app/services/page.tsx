'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLanguage } from '@/i18n';
import {
  getParcelById,
  getParcelByUlpin,
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

const SERVICE_TYPES = [
  { value: 'record_information', label: 'Record Information (RoR)' },
  { value: 'mutation_status', label: 'Mutation Status' },
  { value: 'registration_status', label: 'Registration Status' },
  { value: 'planning_information', label: 'Planning Information' },
  { value: 'property_tax', label: 'Property Tax' },
  { value: 'general_enquiry', label: 'General Enquiry' },
  { value: 'encumbrance_certificate', label: 'Encumbrance Certificate' },
  { value: 'document_copy', label: 'Document Copy' },
  { value: 'other', label: 'Other' },
];

type Tab = 'parcel' | 'submit' | 'track';

interface ParcelLight {
  id: string;
  ulpin: string | null;
  survey_number: string;
  village_name: string;
  mandal_name: string;
  district_name: string;
}

interface ParcelBundle {
  profile: FullParcelProfile;
  rights: RelatedRecord[];
  registrations: RelatedRecord[];
  encumbrances: RelatedRecord[];
  planning: RelatedRecord | null;
  building: RelatedRecord[];
  tax: RelatedRecord | null;
  utilities: RelatedRecord | null;
  restrictions: RelatedRecord[];
  documents: RelatedRecord[];
  history: RelatedRecord[];
}

interface TrackedRequest {
  request: Record<string, unknown>;
  updates: Record<string, unknown>[];
  parcel: Record<string, unknown> | null;
}

const STAGE_LABELS = ['submitted', 'under_review', 'processing', 'resolved'];

function stageTitle(t: { services: Record<string, string> }, status: string): string {
  switch (status) {
    case 'submitted': return t.services.submitted;
    case 'under_review': return t.services.underReview;
    case 'processing': return t.services.processing;
    case 'resolved': return t.services.completed;
    case 'rejected': return t.services.rejected;
    default: return status;
  }
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '—';
  const s = String(v);
  return s.trim() === '' ? '—' : s;
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-500">{text}</p>;
}

export default function ServicesPage() {
  const { t } = useLanguage();
  const { session, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('parcel');

  // ---- parcel search ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'ulpin' | 'survey' | 'document'>('ulpin');
  const [parcelResults, setParcelResults] = useState<ParcelLight[]>([]);
  const [docResults, setDocResults] = useState<Record<string, unknown>[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<ParcelLight | null>(null);
  const [bundle, setBundle] = useState<ParcelBundle | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [searchError, setSearchError] = useState('');

  // ---- submit ----
  const [serviceType, setServiceType] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdRef, setCreatedRef] = useState<string | null>(null);

  // ---- track ----
  const [refInput, setRefInput] = useState('');
  const [tracked, setTracked] = useState<TrackedRequest | null>(null);
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState('');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'parcel', label: t.services.parcelTab },
    { key: 'submit', label: t.services.submitTab },
    { key: 'track', label: t.services.trackTab },
  ];

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const loadBundle = useCallback(async (parcelId: string) => {
    setLoadingBundle(true);
    setBundle(null);
    try {
      const profile = await getParcelById(parcelId);
      if (!profile) throw new Error('Parcel not found in the database.');
      const [rights, registrations, encumbrances, planning, building, tax, utilities, restrictions, documents, history] =
        await Promise.all([
          getRightsByParcelId(parcelId),
          getRegistrationsByParcelId(parcelId),
          getEncumbrancesByParcelId(parcelId),
          getPlanningByParcelId(parcelId),
          getBuildingPermissionsByParcelId(parcelId),
          getTaxByParcelId(parcelId),
          getUtilitiesByParcelId(parcelId),
          getRestrictionsByParcelId(parcelId),
          getDocumentsByParcelId(parcelId),
          getHistoryByParcelId(parcelId),
        ]);
      setBundle({ profile, rights, registrations, encumbrances, planning, building, tax, utilities, restrictions, documents, history });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to load parcel records.');
    } finally {
      setLoadingBundle(false);
    }
  }, []);

  const pickParcel = useCallback((p: ParcelLight) => {
    setSelectedParcel(p);
    setDocResults([]);
    void loadBundle(p.id);
  }, [loadBundle]);

  // Deep links: ?ulpin=, ?service=, ?tab=, ?ref=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const tab = sp.get('tab');
    if (tab === 'submit' || tab === 'track' || tab === 'parcel') setActiveTab(tab);
    const svc = sp.get('service');
    if (svc && SERVICE_TYPES.some(s => s.value === svc)) {
      setServiceType(svc);
      setActiveTab('submit');
    }
    const ref = sp.get('ref');
    if (ref) {
      setRefInput(ref);
      setActiveTab('track');
    }
    const ulpin = sp.get('ulpin');
    if (ulpin) {
      setSearchQuery(ulpin);
      setActiveTab('parcel');
      void (async () => {
        try {
          const profile = await getParcelByUlpin(ulpin);
          if (profile) {
            pickParcel({
              id: profile.id,
              ulpin: profile.ulpin,
              survey_number: profile.survey_number,
              village_name: profile.village.name,
              mandal_name: profile.mandal.name,
              district_name: profile.district.name,
            });
          } else {
            setSearchError(`No parcel found for ULPIN ${ulpin}.`);
          }
        } catch {
          setSearchError('Failed to load the linked parcel.');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchParcels = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    setParcelResults([]);
    setDocResults([]);
    setSelectedParcel(null);
    setBundle(null);
    try {
      const supabase = getSupabase();
      if (searchType === 'document') {
        const { data, error } = await supabase
          .from('registration_records')
          .select('id, parcel_id, document_number, transaction_type, registration_date, transaction_status, parcels!inner(id, ulpin, survey_number)')
          .ilike('document_number', `%${q}%`)
          .limit(10);
        if (error) throw error;
        const rows = (data || []) as unknown as Record<string, unknown>[];
        setDocResults(rows);
        if (rows.length === 0) setSearchError('No registration documents found matching your search.');
      } else {
        let query = supabase
          .from('parcels')
          .select('id, ulpin, survey_number, village:villages!inner(name, mandal:mandals!inner(name, district:districts!inner(name)))')
          .limit(10);
        query = searchType === 'ulpin' ? query.ilike('ulpin', `%${q}%`) : query.ilike('survey_number', `%${q}%`);
        const { data, error } = await query;
        if (error) throw error;
        const results: ParcelLight[] = ((data || []) as unknown as Record<string, unknown>[]).map(r => {
          const v = r.village as Record<string, unknown>;
          const m = v.mandal as Record<string, unknown>;
          const d = m.district as Record<string, unknown>;
          return {
            id: r.id as string,
            ulpin: r.ulpin as string | null,
            survey_number: r.survey_number as string,
            village_name: v.name as string,
            mandal_name: m.name as string,
            district_name: d.name as string,
          };
        });
        setParcelResults(results);
        if (results.length === 0) setSearchError('No parcels found matching your search.');
        if (results.length === 1) pickParcel(results[0]);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searchType, pickParcel]);

  const requestService = (svc: string) => {
    setServiceType(svc);
    setCreatedRef(null);
    setSubmitError('');
    setActiveTab('submit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setCreatedRef(null);
    if (!serviceType) {
      setSubmitError(t.services.selectServiceFirst);
      return;
    }
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/v1/service-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parcel_id: selectedParcel?.id || null,
          citizen_email: email.trim(),
          service_type: serviceType,
          description: description.trim() || null,
          priority,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Failed to submit request.');
      const id = (body?.data as Record<string, unknown> | undefined)?.id as string;
      if (!id) throw new Error('Server did not return a request reference.');
      setCreatedRef(id);
      setDescription('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const trackByRef = useCallback(async (ref: string) => {
    const id = ref.trim();
    if (!id) return;
    setTracking(true);
    setTrackError('');
    setTracked(null);
    try {
      const res = await fetch(`/api/v1/service-requests/${encodeURIComponent(id)}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Request not found. Check the reference number.');
      const data = body?.data as TrackedRequest | undefined;
      if (!data?.request) throw new Error('Request not found. Check the reference number.');
      setTracked(data);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setTracking(false);
    }
  }, []);

  const stageIndex = (status: string): number => {
    if (status === 'rejected') return -1;
    const i = STAGE_LABELS.indexOf(status);
    return i < 0 ? 0 : i;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.services.title}</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            {t.services.subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Demonstration data:</strong> records below come from the live database and are
            marked demonstration where applicable. Unavailable fields are shown as such — never invented.
          </p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-8">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'parcel' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">{t.services.findParcel}</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                  aria-label={t.services.findParcel}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
                >
                  <option value="ulpin">{t.services.ulpinOpt}</option>
                  <option value="survey">{t.services.surveyOpt}</option>
                  <option value="document">{t.services.docOpt}</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchParcels())}
                  placeholder={searchType === 'document' ? 'e.g. DOC-2020-10001' : searchType === 'ulpin' ? 'e.g. AP-KR-VR-GU-000001' : 'e.g. 1/1'}
                  aria-label={t.services.findParcel}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={searchParcels}
                  disabled={searching || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  {searching ? t.services.searching : t.services.searchBtn}
                </button>
              </div>
              {searchError && <p className="text-sm text-red-600 mt-2">{searchError}</p>}
              {parcelResults.length > 1 && (
                <div className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {parcelResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => pickParcel(p)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${selectedParcel?.id === p.id ? 'bg-blue-50' : ''}`}
                    >
                      <span className="font-mono font-medium">{p.ulpin || p.survey_number}</span>
                      <span className="text-gray-500 ml-2">{p.survey_number} · {p.village_name}, {p.mandal_name}</span>
                    </button>
                  ))}
                </div>
              )}
              {docResults.length > 0 && (
                <div className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {docResults.map(d => {
                    const pp = d.parcels as Record<string, unknown>;
                    return (
                      <div key={String(d.id)} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-medium">{String(d.document_number)}</span>
                          <span className="text-gray-500 ml-2">{String(d.transaction_type)} · {String(d.registration_date || '')}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSearchType('ulpin');
                            setSearchQuery(String(pp.ulpin || ''));
                            pickParcel({
                              id: String(pp.id),
                              ulpin: (pp.ulpin as string) || null,
                              survey_number: String(pp.survey_number),
                              village_name: '', mandal_name: '', district_name: '',
                            });
                          }}
                          className="text-blue-600 text-xs font-medium hover:underline flex-shrink-0"
                        >
                          {t.services.openParcel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {loadingBundle && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                {t.services.loadingRecords}
              </div>
            )}

            {bundle && selectedParcel && (
              <div>
                <div className="bg-blue-900 text-white rounded-xl px-5 py-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{bundle.profile.survey_number}{bundle.profile.subdivision_number ? `/${bundle.profile.subdivision_number}` : ''}</p>
                    {bundle.profile.ulpin && <p className="font-mono text-sm text-blue-200">{bundle.profile.ulpin}</p>}
                    <p className="text-xs text-blue-300 mt-0.5">{bundle.profile.village.name}, {bundle.profile.mandal.name}, {bundle.profile.district.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/parcel/profile?ulpin=${bundle.profile.ulpin || ''}`} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium">
                      {t.common.viewFullProfile}
                    </Link>
                    {bundle.profile.ulpin && (
                      <Link href={`/gis-explorer?ulpin=${encodeURIComponent(bundle.profile.ulpin)}`} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium">
                        {t.common.viewOnMap}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Section title={`1 · ${t.profile.ownership}`} action={<button onClick={() => requestService('record_information')} className="text-xs text-blue-600 hover:underline">{t.services.requestService}</button>}>
                    {bundle.rights.length === 0 && <Empty text={t.services.noRights} />}
                    {bundle.rights.map(r => {
                      const rr = r as unknown as Record<string, unknown>;
                      return (
                        <div key={String(rr.id)} className="text-sm space-y-1 py-1 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-gray-900">{str(rr.rights_holder_name)} <span className="text-gray-500 font-normal">({str(rr.right_type)} · {str(rr.rights_holder_type)})</span></p>
                          <p className="text-xs text-gray-600">Share: {str(rr.share)} · Extent: {str(rr.extent)} · Possession: {str(rr.possession_status)}</p>
                          <p className="text-xs text-gray-600">Record: {str(rr.record_number)} · {str(rr.record_date)} · Verification: {str(rr.verification_status)}{rr.is_demonstration ? ' · Demonstration' : ''}</p>
                        </div>
                      );
                    })}
                  </Section>

                  <Section title={`2 · ${t.profile.encumbrance}`} action={<button onClick={() => requestService('encumbrance_certificate')} className="text-xs text-blue-600 hover:underline">{t.services.requestService}</button>}>
                    {bundle.encumbrances.length === 0 && <Empty text={t.services.noEncumbrance} />}
                    {bundle.encumbrances.map(e => {
                      const ee = e as unknown as Record<string, unknown>;
                      return (
                        <div key={String(ee.id)} className="text-sm space-y-1 py-1 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-gray-900 capitalize">{str(ee.encumbrance_type)} <span className={`text-xs px-1.5 py-0.5 rounded ${ee.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{str(ee.status)}</span></p>
                          <p className="text-xs text-gray-600">Ref: {str(ee.reference_number)} · {str(ee.start_date)} → {str(ee.release_date)}</p>
                          {ee.description ? <p className="text-xs text-gray-600">{str(ee.description)}</p> : null}
                        </div>
                      );
                    })}
                  </Section>

                  <Section title={`3 · ${t.profile.registration}`} action={<button onClick={() => requestService('registration_status')} className="text-xs text-blue-600 hover:underline">{t.services.requestService}</button>}>
                    {bundle.registrations.length === 0 && <Empty text={t.services.noRegistration} />}
                    <div className="space-y-2">
                      {bundle.registrations.map(r => {
                        const rr = r as unknown as Record<string, unknown>;
                        return (
                          <div key={String(rr.id)} className="flex gap-3 text-sm">
                            <div className="flex flex-col items-center">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1" />
                              <span className="w-px flex-1 bg-gray-200" />
                            </div>
                            <div className="pb-2">
                              <p className="font-medium text-gray-900">{str(rr.document_number)} <span className="font-normal text-gray-500 capitalize">({str(rr.transaction_type)} · {str(rr.transaction_status)})</span></p>
                              <p className="text-xs text-gray-600">Registered: {str(rr.registration_date)} · Executed: {str(rr.execution_date)}</p>
                              <p className="text-xs text-gray-600">Consideration: ₹{Number(rr.consideration_amount || 0).toLocaleString('en-IN')} · Stamp duty: ₹{Number(rr.stamp_duty || 0).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>

                  <Section title={`4 · ${t.profile.tax}`} action={<button onClick={() => requestService('property_tax')} className="text-xs text-blue-600 hover:underline">{t.services.requestService}</button>}>
                    {!bundle.tax && <Empty text={t.services.noTax} />}
                    {bundle.tax && (() => {
                      const t = bundle.tax as unknown as Record<string, unknown>;
                      return (
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-gray-900">{str(t.assessment_number)} <span className="font-normal text-gray-500">({str(t.assessment_year)})</span></p>
                          <p className="text-xs text-gray-600">Assessed: ₹{Number(t.assessed_value || 0).toLocaleString('en-IN')} · Tax: ₹{Number(t.tax_amount || 0).toLocaleString('en-IN')}</p>
                          <p className="text-xs text-gray-600">Paid: ₹{Number(t.paid_amount || 0).toLocaleString('en-IN')} · Outstanding: ₹{Number(t.outstanding_amount || 0).toLocaleString('en-IN')}</p>
                          <p className="text-xs">Status: <span className={`px-1.5 py-0.5 rounded font-medium ${t.payment_status === 'current' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{str(t.payment_status)}</span></p>
                        </div>
                      );
                    })()}
                  </Section>

                  <Section title={`5 · ${t.profile.building}`} action={<button onClick={() => requestService('planning_information')} className="text-xs text-blue-600 hover:underline">{t.services.requestService}</button>}>
                    {bundle.building.length === 0 && <Empty text={t.services.noBuilding} />}
                    {bundle.building.map(b => {
                      const bb = b as unknown as Record<string, unknown>;
                      return (
                        <div key={String(bb.id)} className="text-sm space-y-1 py-1 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-gray-900">{str(bb.permission_number)} <span className="font-normal text-gray-500 capitalize">({str(bb.approval_status)})</span></p>
                          <p className="text-xs text-gray-600">Use: {str(bb.building_use)} · Floors: {str(bb.permitted_floors)} · Height: {str(bb.permitted_height)} {str(bb.height_unit)} · Built-up: {str(bb.built_up_area)} {str(bb.area_unit)}</p>
                          <p className="text-xs text-gray-600">Authority: {str(bb.authority)} · Date: {str(bb.approval_date)}</p>
                        </div>
                      );
                    })}
                  </Section>

                  <Section title={`6 · ${t.profile.landUse} / ${t.profile.planning}`} action={<button onClick={() => requestService('planning_information')} className="text-xs text-blue-600 hover:underline">{t.services.requestService}</button>}>
                    <p className="text-sm">{t.profile.landUse}: <span className="font-medium capitalize">{bundle.profile.land_use}</span> · {t.profile.classification}: <span className="font-medium">{str(bundle.profile.land_classification)}</span></p>
                    {!bundle.planning && <Empty text={t.services.noPlanning} />}
                    {bundle.planning && (() => {
                      const pl = bundle.planning as unknown as Record<string, unknown>;
                      return (
                        <div className="text-sm space-y-1 mt-1">
                          <p className="font-medium text-gray-900">{str(pl.zoning)}</p>
                          <p className="text-xs text-gray-600">Master plan: {str(pl.master_plan_zone)} · Permitted: {str(pl.permitted_land_use)}</p>
                          {pl.development_restrictions ? <p className="text-xs text-gray-600">Notes: {str(pl.development_restrictions)}</p> : null}
                          <p className="text-xs text-gray-600">Authority: {str(pl.planning_authority)}</p>
                        </div>
                      );
                    })()}
                  </Section>

                  <Section title={`7 · ${t.profile.restrictions}`}>
                    {bundle.restrictions.length === 0 && <Empty text={t.services.noRestrictions} />}
                    {bundle.restrictions.map(r => {
                      const rr = r as unknown as Record<string, unknown>;
                      return (
                        <div key={String(rr.id)} className="text-sm space-y-1 py-1 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-gray-900 capitalize">{String(rr.restriction_type).replace(/_/g, ' ')} <span className="font-normal text-gray-500">({str(rr.status)})</span></p>
                          <p className="text-xs text-gray-600">{str(rr.description)}</p>
                          <p className="text-xs text-gray-600">Authority: {str(rr.authority)} · Effective: {str(rr.effective_date)}</p>
                          {bundle.profile.ulpin && (
                            <Link href={`/gis-explorer?ulpin=${encodeURIComponent(bundle.profile.ulpin)}`} className="text-xs text-blue-600 hover:underline">
                              {t.services.highlightGis}
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </Section>

                  <Section title={`8 · ${t.profile.documents}`} action={<button onClick={() => requestService('document_copy')} className="text-xs text-blue-600 hover:underline">{t.services.requestService}</button>}>
                    {bundle.documents.length === 0 && <Empty text={t.services.noDocuments} />}
                    {bundle.documents.map(d => {
                      const dd = d as unknown as Record<string, unknown>;
                      return (
                        <div key={String(dd.id)} className="text-sm py-1 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-gray-900">{str(dd.document_type)} <span className="font-mono font-normal text-gray-500">{str(dd.document_number)}</span></p>
                          <p className="text-xs text-gray-600">Issued: {str(dd.issue_date)} · {str(dd.issuing_authority)} · Status: {str(dd.verification_status)}</p>
                          <p className="text-xs text-gray-400">{t.services.filesNote}</p>
                        </div>
                      );
                    })}
                  </Section>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'submit' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.services.submitTab}</h2>
            <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-5">
              <div>
                <label htmlFor="svcEmail" className="block text-sm font-medium text-gray-700 mb-1">{t.services.email} <span className="text-red-500">*</span></label>
                <input
                  id="svcEmail" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="svcType" className="block text-sm font-medium text-gray-700 mb-1">{t.services.service} <span className="text-red-500">*</span></label>
                <select id="svcType" value={serviceType} onChange={e => setServiceType(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
                  <option value="">{t.services.selectService}</option>
                  {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">{t.services.parcel}</span>
                {selectedParcel ? (
                  <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between gap-2">
                    <span><strong className="font-mono">{selectedParcel.ulpin || selectedParcel.survey_number}</strong>
                      <span className="text-green-700"> · {selectedParcel.survey_number} · {selectedParcel.village_name}{selectedParcel.mandal_name ? `, ${selectedParcel.mandal_name}` : ''}</span></span>
                    <button type="button" onClick={() => setSelectedParcel(null)} aria-label={t.common.close} className="hover:text-green-900 font-bold">×</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setActiveTab('parcel')} className="text-sm text-blue-600 hover:underline">
                    {t.services.searchSelectParcel}
                  </button>
                )}
              </div>
              <div>
                <label htmlFor="svcDesc" className="block text-sm font-medium text-gray-700 mb-1">{t.services.details}</label>
                <textarea id="svcDesc" value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={2000}
                  placeholder={t.services.detailsPh}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none resize-y" />
              </div>
              <div>
                <label htmlFor="svcPrio" className="block text-sm font-medium text-gray-700 mb-1">{t.services.priority}</label>
                <select id="svcPrio" value={priority} onChange={e => setPriority(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
                  <option value="low">{t.services.low}</option>
                  <option value="normal">{t.services.normal}</option>
                  <option value="high">{t.services.high}</option>
                  <option value="urgent">{t.services.urgent}</option>
                </select>
              </div>
              {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{submitError}</div>}
              {createdRef && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">{t.services.submittedOk}</p>
                  <p className="text-xs text-green-700 mt-1">{t.services.refSave}</p>
                  <p className="font-mono text-sm text-green-900 break-all mt-1">{createdRef}</p>
                  <button type="button" onClick={() => { setRefInput(createdRef); setActiveTab('track'); }}
                    className="mt-2 text-sm font-medium text-green-800 hover:underline">{t.services.trackThis}</button>
                </div>
              )}
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {submitting ? t.services.submittingBtn : t.services.submitBtn}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'track' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.services.trackTitle}</h2>
            <form onSubmit={e => { e.preventDefault(); void trackByRef(refInput); }} className="flex gap-2 mb-4">
              <input value={refInput} onChange={e => setRefInput(e.target.value)}
                placeholder={t.services.refPh}
                aria-label={t.services.trackTitle}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
              <button type="submit" disabled={tracking || !refInput.trim()}
                className="px-5 py-2.5 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {tracking ? t.services.lookingUp : t.services.trackBtn}
              </button>
            </form>
            {trackError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">{trackError}</div>}
            {tracked && (() => {
              const req = tracked.request;
              const status = String(req.status);
              const idx = stageIndex(status);
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{SERVICE_TYPES.find(s => s.value === req.service_type)?.label || String(req.service_type)}</p>
                      <p className="font-mono text-xs text-gray-500 break-all mt-0.5">{String(req.id)}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">{stageTitle(t, status)}</span>
                  </div>
                  <ol className="space-y-0">
                    {STAGE_LABELS.map((s, i) => {
                      const done = idx >= 0 && i <= idx;
                      const upd = tracked.updates.find(u => String(u.new_status) === s) as Record<string, unknown> | undefined;
                      return (
                        <li key={s} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className={`w-3 h-3 rounded-full mt-1 ${done ? 'bg-green-600' : 'bg-gray-300'}`} />
                            {i < STAGE_LABELS.length - 1 && <span className={`w-px flex-1 ${done ? 'bg-green-300' : 'bg-gray-200'}`} style={{ minHeight: 18 }} />}
                          </div>
                          <div className="pb-4">
                            <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>{stageTitle(t, s)}</p>
                            {upd && <p className="text-xs text-gray-500">{String(upd.created_at || '').slice(0, 10)}{upd.notes ? ` · ${String(upd.notes)}` : ''}</p>}
                          </div>
                        </li>
                      );
                    })}
                    {status === 'rejected' && <li className="text-sm font-medium text-red-700">{stageTitle(t, 'rejected')}{(tracked.request.resolution_notes as string) ? ` — ${String(tracked.request.resolution_notes)}` : ''}</li>}
                  </ol>
                  {tracked.parcel && (() => {
                    const pp = tracked.parcel as Record<string, unknown>;
                    return (
                      <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-3 text-sm">
                        <span className="text-gray-600">Parcel: <span className="font-mono text-gray-900">{String(pp.ulpin || pp.survey_number)}</span></span>
                        {typeof pp.ulpin === 'string' && pp.ulpin && <Link href={`/parcel/profile?ulpin=${pp.ulpin}`} className="text-blue-600 hover:underline">{t.common.viewFullProfile}</Link>}
                        {typeof pp.ulpin === 'string' && pp.ulpin && <Link href={`/gis-explorer?ulpin=${encodeURIComponent(pp.ulpin)}`} className="text-blue-600 hover:underline">{t.common.viewOnMap}</Link>}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
