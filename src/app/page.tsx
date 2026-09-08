'use client';

import Link from 'next/link';
import { DataDisclaimer } from '@/components/common/DataSourceBadge';
import { useLanguage } from '@/i18n';

const DATA_FLOW_STEPS = [
  { label: 'Revenue', icon: 'R' },
  { label: 'Registration', icon: 'Re' },
  { label: 'Planning', icon: 'P' },
  { label: 'Tax', icon: 'T' },
  { label: 'Utilities', icon: 'U' },
  { label: 'Restrictions', icon: 'Rs' },
];

const FEATURES = [
  {
    title: 'Unified Parcel Identity',
    description: 'Every parcel connected through ULPIN - a single digital identity across all departments.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" />
      </svg>
    ),
  },
  {
    title: 'Connected Governance',
    description: 'Breaking departmental silos. Revenue, Registration, Planning, Tax and more on one platform.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
      </svg>
    ),
  },
  {
    title: 'GIS-Based Intelligence',
    description: 'Spatial data, cadastral maps, and parcel boundaries for every piece of land.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" />
      </svg>
    ),
  },
  {
    title: 'Data Transparency',
    description: 'Clear visibility into data sources, freshness, and verification status.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const { t } = useLanguage();
  const FEATURES_T = [
    { title: t.home.f1t, description: t.home.f1d },
    { title: t.home.f2t, description: t.home.f2d },
    { title: t.home.f3t, description: t.home.f3d },
    { title: t.home.f4t, description: t.home.f4d },
  ];
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-900 to-blue-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-700/50 text-blue-200 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {t.home.badge}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Dharani<span className="text-blue-300">Setu</span>
            </h1>
            <p className="mt-4 text-xl sm:text-2xl text-blue-200 font-light">
              {t.home.tagline}
            </p>
            <p className="mt-6 text-base text-blue-200/80 max-w-2xl leading-relaxed">
              {t.home.description}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-blue-900 font-semibold text-sm hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {t.home.searchCta}
              </Link>
              <Link
                href="/gis-explorer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-700/50 text-white font-semibold text-sm hover:bg-blue-700 transition-colors border border-blue-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" />
                </svg>
                {t.home.gisCta}
              </Link>
              <Link
                href="/government"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-transparent text-blue-200 font-semibold text-sm hover:bg-blue-800 transition-colors border border-blue-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                {t.nav.government} {t.nav.signIn}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Data Flow Visualization */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">How DharaniSetu Works</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {DATA_FLOW_STEPS.map((step) => (
                <div key={step.label} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="w-7 h-7 rounded bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {step.icon}
                  </span>
                  <span className="text-xs font-medium text-gray-700 hidden sm:inline">{step.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-5 h-5 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <div className="px-5 py-3 bg-blue-900 text-white rounded-lg font-semibold text-sm">
              DHARANISETU
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-5 h-5 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <div className="px-5 py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm">
              ULPIN
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-5 h-5 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <div className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm border border-gray-300">
              Unified Parcel Info
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.home.featuresTitle}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={feature.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{FEATURES_T[i].title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{FEATURES_T[i].description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Data Model Preview */}
      <section className="bg-white border-t border-gray-200 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Parcel Information Architecture</h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Every important piece of land information is associated with a land parcel.
            </p>
          </div>
          <div className="max-w-3xl mx-auto bg-gray-50 rounded-2xl border border-gray-200 p-6 sm:p-8">
            <div className="font-mono text-sm space-y-1">
              <div className="text-blue-700 font-bold">Parcel / ULPIN</div>
              <div className="pl-4 text-gray-600">├── Cadastral geometry</div>
              <div className="pl-4 text-gray-600">├── Survey number</div>
              <div className="pl-4 text-gray-600">├── Village / Ward</div>
              <div className="pl-4 text-gray-600">├── Record of Rights</div>
              <div className="pl-4 text-gray-600">├── Owner / rights information</div>
              <div className="pl-4 text-gray-600">├── Mutation history</div>
              <div className="pl-4 text-gray-600">├── Registration history</div>
              <div className="pl-4 text-gray-600">├── Encumbrance</div>
              <div className="pl-4 text-gray-600">├── Land use / Zoning</div>
              <div className="pl-4 text-gray-600">├── Building permissions</div>
              <div className="pl-4 text-gray-600">├── Property tax</div>
              <div className="pl-4 text-gray-600">├── Utilities</div>
              <div className="pl-4 text-gray-600">├── Restrictions</div>
              <div className="pl-4 text-gray-600">├── Valuation</div>
              <div className="pl-4 text-gray-600">├── Documents</div>
              <div className="pl-4 text-gray-600">└── Change / event history</div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Step 1 implements the foundational UI and architecture. Full data model integration follows in subsequent steps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demonstration Data Notice */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <DataDisclaimer variant="banner" />
        </div>
      </section>

      {/* Current Status */}
      <section className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-gray-900">Current State</h3>
              </div>
              <p className="text-sm text-gray-600">Andhra Pradesh (Demonstration)</p>
              <p className="text-xs text-gray-500 mt-1">Architecture supports all Indian states</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">Step 1 Focus</h3>
              </div>
              <p className="text-sm text-gray-600">UI Foundation & Architecture</p>
              <p className="text-xs text-gray-500 mt-1">Database, search, and AI in later steps</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">Data Sources</h3>
              </div>
              <p className="text-sm text-gray-600">Demonstration + Open Data</p>
              <p className="text-xs text-gray-500 mt-1">Official data integration in Step 2+</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
