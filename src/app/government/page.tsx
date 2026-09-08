'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { ROLE_LABELS, ROLE_DEPARTMENTS, AppRole } from '@/lib/auth';
import { useLanguage } from '@/i18n';
import { useEffect, useState, useCallback } from 'react';
import { DashboardStats } from '@/services/dashboard';

const ROLE_DASHBOARDS: Record<string, { modules: { title: string; description: string; icon: string; count: string }[] }> = {
  revenue_officer: {
    modules: [
      { title: 'Parcel Verification', description: 'Review and verify parcel data from revenue records.', icon: 'check-circle', count: 'Loading...' },
      { title: 'Land Records', description: 'View and manage revenue land records and mutations.', icon: 'document', count: 'Loading...' },
      { title: 'Rights Management', description: 'Manage ownership and rights records.', icon: 'users', count: 'Loading...' },
      { title: 'Encumbrance Review', description: 'Review encumbrance certificates and status.', icon: 'shield', count: 'Loading...' },
    ],
  },
  registration_officer: {
    modules: [
      { title: 'Registration Records', description: 'Manage document registration records.', icon: 'document', count: 'Loading...' },
      { title: 'Encumbrance Updates', description: 'Update encumbrance status for registered documents.', icon: 'shield', count: 'Loading...' },
      { title: 'Document Search', description: 'Search registered documents by parcel or document number.', icon: 'search', count: 'Available' },
    ],
  },
  planning_officer: {
    modules: [
      { title: 'Zoning Management', description: 'Manage zoning classifications and master plan zones.', icon: 'map', count: 'Loading...' },
      { title: 'Building Permissions', description: 'Review building permission applications.', icon: 'building', count: 'Loading...' },
      { title: 'Development Restrictions', description: 'Manage development restrictions and road reservations.', icon: 'warning', count: 'Loading...' },
    ],
  },
  municipal_officer: {
    modules: [
      { title: 'Property Tax', description: 'Manage property tax assessments and payments.', icon: 'currency', count: 'Loading...' },
      { title: 'Utility Records', description: 'Manage utility connection records.', icon: 'lightning', count: 'Loading...' },
      { title: 'Assessment Appeals', description: 'Review and manage tax assessment appeals.', icon: 'document', count: 'Loading...' },
    ],
  },
  administrator: {
    modules: [
      { title: 'Data Sources', description: 'Manage data sources and integration status.', icon: 'database', count: 'Loading...' },
      { title: 'Data Quality', description: 'Monitor data quality across all sources.', icon: 'chart', count: 'Loading...' },
      { title: 'User Management', description: 'Manage user accounts and role assignments.', icon: 'users', count: 'Loading...' },
      { title: 'Integration Status', description: 'Monitor API connections and data sync status.', icon: 'connection', count: 'Loading...' },
      { title: 'Audit Logs', description: 'View system audit logs and user activity.', icon: 'log', count: 'Loading...' },
    ],
  },
  citizen: {
    modules: [
      { title: 'Parcel Search', description: 'Search for land parcels by ULPIN or survey number.', icon: 'search', count: 'Available' },
      { title: 'Public Records', description: 'View publicly available land records.', icon: 'document', count: 'Read Only' },
    ],
  },
};

const ICONS: Record<string, JSX.Element> = {
  'check-circle': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  'document': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  'users': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  'shield': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  'map': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" /></svg>,
  'building': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>,
  'warning': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  'currency': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  'lightning': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  'database': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
  'chart': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  'search': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  'connection': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.243a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.33 8.528" /></svg>,
  'log': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  'alert-triangle': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  'check': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
  'x-mark': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  'clock': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  'inbox': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-12.54 0H4.87m7.39 0a48.57 48.57 0 00-4.16 0m4.16 0a48.397 48.397 0 014.16 0M6.366 13.5H2.25m4.116 0a48.57 48.57 0 00-4.16 0m4.16 0a48.397 48.397 0 014.16 0M18.953 13.5h3.86m-3.86 0H18.95m0 0h-3.86" /></svg>,
  'folder-open': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>,
};

interface AnalyticsRow {
  id: string;
  name: string;
  parcel_count: number;
  verified_percent: number;
  ulpin_percent: number;
  pending_review: number;
}

interface ChangeDetection {
  id: string;
  parcel_id: string;
  ulpin: string | null;
  survey_number: string | null;
  change_type: string;
  confidence: number;
  review_status: string;
  detected_at: string;
  details: string | null;
}

interface ServiceRequest {
  id: string;
  service_type: string;
  parcel_id: string;
  ulpin: string | null;
  survey_number: string | null;
  citizen_email: string;
  status: string;
  priority: string;
  submitted_at: string;
  description: string;
}

export default function GovernmentDashboard() {
  const { t } = useLanguage();
  const { profile, session } = useAuth();
  const role = (profile?.role || 'citizen') as AppRole;
  const dashboardConfig = ROLE_DASHBOARDS[role] || ROLE_DASHBOARDS.citizen;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<{ total_parcels: number; verified_parcels: number; ulpin_coverage: number; data_conflicts: number; change_detection_alerts: number; open_service_requests: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [analyticsLevel, setAnalyticsLevel] = useState<'state' | 'district' | 'mandal' | 'village'>('state');
  const [analyticsParentId, setAnalyticsParentId] = useState<string | null>(null);
  const [analyticsParentName, setAnalyticsParentName] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsRow[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [changeDetections, setChangeDetections] = useState<ChangeDetection[]>([]);
  const [cdLoading, setCdLoading] = useState(true);
  const [cdActionLoading, setCdActionLoading] = useState<string | null>(null);

  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [srLoading, setSrLoading] = useState(true);
  const [srActionLoading, setSrActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/v1/dashboard');
        const json = await res.json();
        if (json.status === 'success') setStats(json.data);
      } catch { /* stats unavailable */ }

      try {
        const res = await fetch('/api/v1/analytics');
        const json = await res.json();
        if (json.status === 'success') setAnalytics(json.data);
      } catch { /* analytics unavailable */ }

      setLoading(false);
    }
    loadStats();
  }, []);

  useEffect(() => {
    async function loadChangeDetections() {
      try {
        const res = await fetch('/api/v1/change-detections');
        const json = await res.json();
        if (json.status === 'success') setChangeDetections(json.data || []);
      } catch { /* cd unavailable */ }
      setCdLoading(false);
    }
    loadChangeDetections();
  }, []);

  useEffect(() => {
    async function loadServiceRequests() {
      try {
        const headers: Record<string, string> = {};
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        const res = await fetch('/api/v1/service-requests?status=submitted', { headers });
        const json = await res.json();
        if (json.status === 'success') setServiceRequests(json.data || []);
      } catch { /* sr unavailable */ }
      setSrLoading(false);
    }
    loadServiceRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const fetchAnalyticsLevel = useCallback(async (level: 'state' | 'district' | 'mandal' | 'village', parentId: string | null) => {
    setAnalyticsLoading(true);
    try {
      let url = `/api/v1/analytics/${level}`;
      if (parentId) url += `?parent_id=${parentId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success') setAnalyticsData(json.data || []);
      else setAnalyticsData([]);
    } catch { setAnalyticsData([]); }
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => {
    fetchAnalyticsLevel(analyticsLevel, analyticsParentId);
  }, [analyticsLevel, analyticsParentId, fetchAnalyticsLevel]);

  const handleAnalyticsRowClick = (row: AnalyticsRow) => {
    const levelOrder: Array<'state' | 'district' | 'mandal' | 'village'> = ['state', 'district', 'mandal', 'village'];
    const currentIdx = levelOrder.indexOf(analyticsLevel);
    if (currentIdx < levelOrder.length - 1) {
      setAnalyticsParentId(row.id);
      setAnalyticsParentName(row.name);
      setAnalyticsLevel(levelOrder[currentIdx + 1]);
    }
  };

  const handleAnalyticsBack = () => {
    const levelOrder: Array<'state' | 'district' | 'mandal' | 'village'> = ['state', 'district', 'mandal', 'village'];
    const currentIdx = levelOrder.indexOf(analyticsLevel);
    if (currentIdx > 0) {
      setAnalyticsLevel(levelOrder[currentIdx - 1]);
      setAnalyticsParentId(null);
      setAnalyticsParentName('');
    }
  };

  const handleCdAction = async (cdId: string, action: 'confirmed' | 'rejected' | 'field_verification_requested') => {
    setCdActionLoading(cdId);
    try {
      const res = await fetch(`/api/v1/change-detections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cdId, review_status: action }),
      });
      if (res.ok) {
        setChangeDetections(prev =>
          prev.map(cd => cd.id === cdId ? { ...cd, review_status: action } : cd)
        );
      }
    } catch { /* action failed */ }
    setCdActionLoading(null);
  };

  const handleSrStatus = async (srId: string, status: string) => {
    setSrActionLoading(srId);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/v1/service-requests/${srId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setServiceRequests(prev => prev.filter(sr => sr.id !== srId));
      }
    } catch { /* action failed */ }
    setSrActionLoading(null);
  };

  const TITLE_T: Record<string, string> = {
    'Parcel Verification': t.gov.pendingReview,
    'Land Records': t.gov.parcels,
    'Rights Management': t.gov.rights,
    'Encumbrance Review': t.gov.encumbrances,
    'Registration Records': t.gov.registrations,
    'Encumbrance Updates': t.gov.encumbrances,
    'Document Search': t.gov.documents,
    'Zoning Management': t.gov.planning,
    'Building Permissions': t.gov.building,
    'Development Restrictions': t.gov.restrictions,
    'Property Tax': t.gov.tax,
    'Utility Records': t.gov.utilities,
    'Assessment Appeals': t.gov.tax,
    'Data Sources': t.profile.dataSources,
    'Data Quality': t.gov.verified,
    'Integration Status': t.gis.dataSources,
    'Audit Logs': t.profile.history,
    'Parcel Search': t.nav.searchParcel,
    'Public Records': t.gov.documents,
  };

  function getModuleCount(moduleTitle: string): string {
    if (!stats) return 'Loading...';
    switch (moduleTitle) {
      case 'Parcel Verification': return `${stats.pendingReview} pending`;
      case 'Land Records': return `${stats.totalParcels} total`;
      case 'Rights Management': return `${stats.totalRightsRecords || 0} records`;
      case 'Encumbrance Review': return `${stats.totalEncumbrances || 0} total`;
      case 'Registration Records': return `${stats.totalRegistrations || 0} total`;
      case 'Zoning Management': return `${stats.totalPlanningRecords || 0} zones`;
      case 'Building Permissions': return `${stats.totalBuildingPermissions || 0} total`;
      case 'Property Tax': return `${stats.totalTaxRecords || 0} records`;
      case 'Utility Records': return `${stats.totalUtilities || 0} records`;
      case 'Data Sources': return `${stats.sourceCounts?.length || 0} sources`;
      case 'Data Quality': return `${stats.verificationPercentage}% verified`;
      default: return '';
    }
  }

  const ulpinCoverage = stats
    ? stats.totalParcels > 0
      ? Math.round((stats.parcelsWithUlpin / stats.totalParcels) * 100)
      : 0
    : analytics?.ulpin_coverage ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{t.gov.title}</h1>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">{ROLE_LABELS[role]}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {profile?.department || ROLE_DEPARTMENTS[role] || 'DharaniSetu administration'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Enhanced Stats Section ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t.gov.totalParcels}</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats?.totalParcels ?? analytics?.total_parcels ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-1">{stats?.sourceCounts?.length || 0} data sources</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t.gov.verified}</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats?.verifiedParcels ?? analytics?.verified_parcels ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-1">{stats?.verificationPercentage ?? 0}% of total</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t.gov.pending}</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats?.pendingReview ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-1">{stats?.unverifiedParcels ?? 0} unverified</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t.gov.ulpinCoverage}</p>
            <p className="text-2xl font-bold mt-1 text-indigo-600">{ulpinCoverage}%</p>
            <p className="text-xs text-gray-400 mt-1">{stats?.parcelsWithUlpin ?? 0} assigned</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t.gov.conflicts}</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{analytics?.data_conflicts ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-1">Requires resolution</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t.gov.changeAlerts}</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{analytics?.change_detection_alerts ?? changeDetections.filter(c => c.review_status === 'pending').length}</p>
            <p className="text-xs text-gray-400 mt-1">Pending review</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t.gov.serviceRequests}</p>
            <p className="text-2xl font-bold mt-1 text-cyan-600">{analytics?.open_service_requests ?? serviceRequests.length}</p>
            <p className="text-xs text-gray-400 mt-1">Open requests</p>
          </div>
        </div>

        {/* ── Land Stack Database Statistics (live from Supabase) ── */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">{t.gov.landStack}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t.gov.liveDbNote}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-6">
            {[
              { label: t.gov.parcels, value: stats?.totalParcels },
              { label: t.gov.rights, value: stats?.totalRightsRecords },
              { label: t.gov.registrations, value: stats?.totalRegistrations },
              { label: t.gov.encumbrances, value: stats?.totalEncumbrances },
              { label: t.gov.planning, value: stats?.totalPlanningRecords },
              { label: t.gov.building, value: stats?.totalBuildingPermissions },
              { label: t.gov.tax, value: stats?.totalTaxRecords },
              { label: t.gov.utilities, value: stats?.totalUtilities },
              { label: t.gov.restrictions, value: stats?.totalRestrictions },
              { label: t.gov.documents, value: (stats as unknown as { totalDocuments?: number })?.totalDocuments },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold mt-1 text-gray-900">{loading ? '—' : (s.value ?? 0)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Parcels by land use / district (live from database) ── */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.gis.landUse}</h3>
              <div className="flex flex-wrap gap-2">
                {(stats.byLandUse || []).map(u => (
                  <span key={u.land_use} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-medium capitalize">
                    {u.land_use} · {u.count}
                  </span>
                ))}
                {(!stats.byLandUse || stats.byLandUse.length === 0) && <span className="text-xs text-gray-500">{t.gov.noData}</span>}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.gis.district}</h3>
              <div className="flex flex-wrap gap-2">
                {(stats.byDistrict || []).map(d => (
                  <span key={d.name} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium">
                    {d.name} · {d.count}
                  </span>
                ))}
                {(!stats.byDistrict || stats.byDistrict.length === 0) && <span className="text-xs text-gray-500">{t.gov.noData}</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── Role-Based Modules ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {dashboardConfig.modules.map((mod) => (
            <div key={mod.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  {ICONS[mod.icon] || ICONS.document}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{TITLE_T[mod.title] || mod.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <span className="text-sm font-medium text-blue-600">{getModuleCount(mod.title) || mod.count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── District/Village Analytics Drill-down ── */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">{t.gov.analytics}</h3>
            <div className="flex items-center gap-2">
              {analyticsParentId && (
                <button
                  onClick={handleAnalyticsBack}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {t.gov.back}
                </button>
              )}
              <select
                value={analyticsLevel}
                onChange={(e) => {
                  setAnalyticsLevel(e.target.value as 'state' | 'district' | 'mandal' | 'village');
                  setAnalyticsParentId(null);
                  setAnalyticsParentName('');
                }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="state">State</option>
                <option value="district">District</option>
                <option value="mandal">Mandal</option>
                <option value="village">Village</option>
              </select>
            </div>
          </div>
          {analyticsParentName && (
            <div className="px-6 py-2 bg-blue-50 border-b border-blue-100">
              <span className="text-sm text-blue-700">
                Viewing: <span className="font-semibold">{analyticsParentName}</span> → {analyticsLevel}
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">{t.gov.name}</th>
                  <th className="px-6 py-3 text-right">Parcels</th>
                  <th className="px-6 py-3 text-right">{t.gov.verifiedPct}</th>
                  <th className="px-6 py-3 text-right">{t.gov.ulpinPct}</th>
                  <th className="px-6 py-3 text-right">{t.gov.pendingReview}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analyticsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">{t.gov.loadingData}</td>
                  </tr>
                ) : analyticsData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">{t.gov.noData}</td>
                  </tr>
                ) : (
                  analyticsData.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleAnalyticsRowClick(row)}
                      className={`hover:bg-gray-50 ${analyticsLevel !== 'village' ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{row.name}</span>
                        {analyticsLevel !== 'village' && (
                          <span className="ml-2 text-xs text-blue-500">→ drill down</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{row.parcel_count.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        <span className={`font-medium ${row.verified_percent >= 80 ? 'text-emerald-600' : row.verified_percent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {row.verified_percent}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <span className={`font-medium ${row.ulpin_percent >= 80 ? 'text-emerald-600' : row.ulpin_percent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {row.ulpin_percent}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-amber-600 font-medium">{row.pending_review}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Change Detection Alerts ── */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t.gov.changeTitle}</h3>
              <p className="mt-0.5 text-xs text-amber-600 font-semibold uppercase tracking-wide">
                DEMONSTRATION — NOT ACTUAL SATELLITE ANALYSIS
              </p>
            </div>
            <span className="text-sm text-gray-500">{changeDetections.length} total</span>
          </div>
          <div className="divide-y divide-gray-100">
            {cdLoading ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">{t.common.loading}</div>
            ) : changeDetections.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">{t.gov.noData}</div>
            ) : (
              changeDetections.map((cd) => (
                <div key={cd.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {ICONS['alert-triangle']}
                        <span className="text-sm font-medium text-gray-900">
                          {cd.ulpin || cd.survey_number || cd.parcel_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          cd.change_type === 'boundary_change' ? 'bg-red-100 text-red-700'
                            : cd.change_type === 'new_construction' ? 'bg-orange-100 text-orange-700'
                            : cd.change_type === 'vegetation_change' ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {cd.change_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span>Confidence: {(cd.confidence * 100).toFixed(0)}%</span>
                        <span className={`font-medium ${
                          cd.review_status === 'confirmed' ? 'text-emerald-600'
                            : cd.review_status === 'rejected' ? 'text-red-600'
                            : cd.review_status === 'field_verification_requested' ? 'text-blue-600'
                            : 'text-amber-600'
                        }`}>
                          {cd.review_status.replace(/_/g, ' ')}
                        </span>
                        <span>{new Date(cd.detected_at).toLocaleDateString()}</span>
                      </div>
                      {cd.details && (
                        <p className="mt-1 text-xs text-gray-500 truncate">{cd.details}</p>
                      )}
                    </div>
                    {cd.review_status === 'pending' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCdAction(cd.id, 'confirmed')}
                          disabled={cdActionLoading === cd.id}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                          title="Confirm"
                        >
                          {ICONS['check']}
                        </button>
                        <button
                          onClick={() => handleCdAction(cd.id, 'rejected')}
                          disabled={cdActionLoading === cd.id}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          title="Reject"
                        >
                          {ICONS['x-mark']}
                        </button>
                        <button
                          onClick={() => handleCdAction(cd.id, 'field_verification_requested')}
                          disabled={cdActionLoading === cd.id}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                          title={t.gov.fieldVerification}
                        >
                          {ICONS['clock']}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Service Request Queue ── */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ICONS['inbox']}
              <h3 className="text-base font-semibold text-gray-900">{t.gov.queueTitle}</h3>
            </div>
            <span className="text-sm text-gray-500">{serviceRequests.length} open</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Parcel</th>
                  <th className="px-6 py-3">Citizen</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {srLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">{t.common.loading}</td>
                  </tr>
                ) : serviceRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">{t.gov.noData}</td>
                  </tr>
                ) : (
                  serviceRequests.map((sr) => (
                    <tr key={sr.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900 capitalize">{sr.service_type.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{sr.ulpin || sr.survey_number || sr.parcel_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{sr.citizen_email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          sr.priority === 'urgent' ? 'bg-red-100 text-red-700'
                            : sr.priority === 'high' ? 'bg-orange-100 text-orange-700'
                            : sr.priority === 'medium' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {sr.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sr.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSrStatus(sr.id, 'under_review')}
                            disabled={srActionLoading === sr.id}
                            className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                          >
                            {t.gov.start}
                          </button>
                          <button
                            onClick={() => handleSrStatus(sr.id, 'resolved')}
                            disabled={srActionLoading === sr.id}
                            className="px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {t.gov.resolve}
                          </button>
                          <button
                            onClick={() => handleSrStatus(sr.id, 'rejected')}
                            disabled={srActionLoading === sr.id}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            {t.gov.reject}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Data Source Summary ── */}
        {stats && stats.sourceCounts && stats.sourceCounts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{t.profile.dataSources}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.sourceCounts.map((source) => (
                <div key={source.name} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{source.name}</p>
                    <p className="text-xs text-gray-500">{source.source_type}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {source.count} parcels
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Activity Feed ── */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">{t.gov.recentActivity}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {(stats?.recentVerifications || []).slice(0, 5).map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${activity.action === 'verified' ? 'bg-emerald-500' : activity.action === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.ulpin || activity.parcelId}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activity.action} by {activity.verifier}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.recentVerifications || stats.recentVerifications.length === 0) && (
              <div className="px-6 py-4 text-sm text-gray-500">{t.gov.noActivity}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
