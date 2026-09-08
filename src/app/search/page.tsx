'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DataDisclaimer } from '@/components/common/DataSourceBadge';
import { useLanguage } from '@/i18n';
import {
  searchParcels,
  getStates,
  getDistricts,
  getMandals,
  getVillages,
  ParcelSearchResult,
  LocationOption,
  SearchFilters,
} from '@/services/parcelSearch';

const SEARCH_TYPES = [
  { value: 'ulpin', labelKey: 'ulpin' },
  { value: 'survey', labelKey: 'survey' },
  { value: 'reference', labelKey: 'reference' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  verified: 'bg-emerald-100 text-emerald-700',
  pending_verification: 'bg-amber-100 text-amber-700',
  unverified: 'bg-gray-100 text-gray-600',
  disputed: 'bg-red-100 text-red-700',
};

export default function SearchPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'ulpin' | 'survey' | 'reference'>('ulpin');
  const [results, setResults] = useState<ParcelSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Location filter state
  const [states, setStates] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [mandals, setMandals] = useState<LocationOption[]>([]);
  const [villages, setVillages] = useState<LocationOption[]>([]);

  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedMandalId, setSelectedMandalId] = useState<string>('');
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [selectedLandUse, setSelectedLandUse] = useState<string>('');

  const [loadingLocations, setLoadingLocations] = useState(false);

  // Load states on mount
  useEffect(() => {
    getStates()
      .then(setStates)
      .catch(() => {});
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      setSelectedDistrictId('');
      return;
    }
    setLoadingLocations(true);
    getDistricts(selectedStateId)
      .then((data) => {
        setDistricts(data);
        setSelectedDistrictId('');
        setMandals([]);
        setSelectedMandalId('');
        setVillages([]);
        setSelectedVillageId('');
      })
      .catch(() => {})
      .finally(() => setLoadingLocations(false));
  }, [selectedStateId]);

  // Load mandals when district changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setMandals([]);
      setSelectedMandalId('');
      return;
    }
    setLoadingLocations(true);
    getMandals(selectedDistrictId)
      .then((data) => {
        setMandals(data);
        setSelectedMandalId('');
        setVillages([]);
        setSelectedVillageId('');
      })
      .catch(() => {})
      .finally(() => setLoadingLocations(false));
  }, [selectedDistrictId]);

  // Load villages when mandal changes
  useEffect(() => {
    if (!selectedMandalId) {
      setVillages([]);
      setSelectedVillageId('');
      return;
    }
    setLoadingLocations(true);
    getVillages(selectedMandalId)
      .then((data) => {
        setVillages(data);
        setSelectedVillageId('');
      })
      .catch(() => {})
      .finally(() => setLoadingLocations(false));
  }, [selectedMandalId]);

  const doSearch = useCallback(async (page: number = 0, overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const hasTextFilter = q.trim().length > 0;
    const hasLocationFilter = selectedVillageId || selectedMandalId || selectedDistrictId || selectedStateId || selectedLandUse;

    if (!hasTextFilter && !hasLocationFilter) {
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const filters: SearchFilters = {
        searchType: hasTextFilter ? searchType : undefined,
        query: hasTextFilter ? q : undefined,
        stateId: selectedStateId || undefined,
        districtId: selectedDistrictId || undefined,
        mandalId: selectedMandalId || undefined,
        villageId: selectedVillageId || undefined,
        landUse: selectedLandUse || undefined,
      };

      const result = await searchParcels(filters, page);
      setResults(result.data);
      setTotalCount(result.count);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('[DharaniSetu] Search error:', msg);
      setError(msg);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType, selectedStateId, selectedDistrictId, selectedMandalId, selectedVillageId, selectedLandUse]);

  // Debounced auto-search while typing (submit still works immediately).
  useEffect(() => {
    if (!searchQuery.trim() && !selectedLandUse) return;
    const timer = setTimeout(() => {
      void doSearch(0);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedLandUse]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(0);
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    setSearchType('ulpin');
    doSearch(0, query);
  };

  const handleLoadMore = () => {
    doSearch(currentPage + 1);
  };

  const hasActiveFilters = searchQuery.trim().length > 0 ||
    selectedStateId || selectedDistrictId || selectedMandalId || selectedVillageId || selectedLandUse;

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.search.title}</h1>
            <p className="mt-2 text-gray-600">
              {t.search.subtitle}
            </p>
          </div>

          {/* Text Search */}
          <form onSubmit={handleSearch} className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                className="px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:w-44"
              >
                {SEARCH_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{t.search[s.labelKey]}</option>
                ))}
              </select>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchType === 'ulpin' ? 'e.g., AP-KR-VR-GU-000001' :
                    searchType === 'survey' ? 'e.g., 102/3' :
                    'e.g., DEMO-REC-001'
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                )}
                {t.common.search}
              </button>
            </div>
          </form>

          {/* Location Filters */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <select
              value={selectedStateId}
              onChange={(e) => setSelectedStateId(e.target.value)}
              aria-label={t.search.allStates}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.search.allStates}</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={selectedDistrictId}
              onChange={(e) => setSelectedDistrictId(e.target.value)}
              disabled={!selectedStateId || loadingLocations}
              aria-label={t.search.allDistricts}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">{t.search.allDistricts}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={selectedMandalId}
              onChange={(e) => setSelectedMandalId(e.target.value)}
              disabled={!selectedDistrictId || loadingLocations}
              aria-label={t.search.allMandals}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">{t.search.allMandals}</option>
              {mandals.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              disabled={!selectedMandalId || loadingLocations}
              aria-label={t.search.allVillages}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">{t.search.allVillages}</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <select
              value={selectedLandUse}
              onChange={(e) => setSelectedLandUse(e.target.value)}
              aria-label={t.search.landUse}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.search.landUse}</option>
              {['residential', 'agricultural', 'commercial', 'industrial', 'institutional', 'vacant', 'other'].map((u) => (
                <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">{t.search.quick}</span>
            {['AP-KR-VR-GU-000001', '1/1', '10/2'].map((q) => (
              <button
                key={q}
                onClick={() => handleQuickSearch(q)}
                className="px-2.5 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DataDisclaimer variant="banner" />

          <div className="mt-6">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {loading ? (
                  t.search.searching
                ) : hasSearched ? (
                  `${t.search.results} (${totalCount} ${totalCount !== 1 ? t.search.parcels : t.search.parcel})`
                ) : (
                  t.search.enterPrompt
                )}
              </h2>
              {hasActiveFilters && !loading && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStateId('');
                    setSelectedDistrictId('');
                    setSelectedMandalId('');
                    setSelectedVillageId('');
                    setSelectedLandUse('');
                    setResults([]);
                    setTotalCount(0);
                    setHasSearched(false);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {t.search.clearFilters}
                </button>
              )}
              <Link
                href="/gis-explorer"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" />
                </svg>
                {t.search.viewOnMap}
              </Link>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-sm text-gray-600">{t.search.searching}</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
                <svg className="w-12 h-12 text-red-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{t.search.searchError}</h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <button
                  onClick={() => doSearch(0)}
                  className="mt-4 px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800"
                >
                  {t.search.tryAgain}
                </button>
              </div>
            )}

            {/* Empty State - No Search Performed */}
            {!loading && !error && !hasSearched && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{t.search.emptyTitle}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t.search.emptyHint}
                </p>
              </div>
            )}

            {/* No Results */}
            {!loading && !error && hasSearched && results.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{t.search.noResultsTitle}</h3>
                <p className="mt-1 text-sm text-gray-500">{t.search.noResultsHint}</p>
              </div>
            )}

            {/* Results List */}
            {!loading && results.length > 0 && (
              <>
                <div className="space-y-3">
                  {results.map((parcel) => (
                    <div
                      key={parcel.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <Link
                          href={`/parcel/profile?ulpin=${parcel.ulpin || ''}`}
                          className="flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-gray-900">
                              {parcel.survey_number}
                              {parcel.subdivision_number && (
                                <span className="text-gray-400">/{parcel.subdivision_number}</span>
                              )}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[parcel.data_status] || 'bg-gray-100 text-gray-600'}`}>
                              {parcel.data_status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            {parcel.ulpin && (
                              <span>ULPIN: <span className="font-mono text-gray-900">{parcel.ulpin}</span></span>
                            )}
                            <span>{parcel.village_name}</span>
                            <span>{parcel.mandal_name}</span>
                            <span>{parcel.district_name}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>{t.search.area}: {parcel.area} {parcel.area_unit}</span>
                            {parcel.land_use && <span>{t.search.landUse}: {parcel.land_use}</span>}
                            {parcel.parcel_reference && <span>Ref: {parcel.parcel_reference}</span>}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                          {parcel.ulpin && (
                            <Link
                              href={`/gis-explorer?ulpin=${encodeURIComponent(parcel.ulpin)}`}
                              title={t.search.viewOnMap}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.003a3.375 3.375 0 11-6.746 0 3.375 3.375 0 016.746 0zM9.75 15.75v4.5m3-6.75V3.75m0 0a3.375 3.375 0 00-6.746 0 3.375 3.375 0 006.746 0zM14.25 18v-4.5m0 4.5h.008" />
                              </svg>
                              Map
                            </Link>
                          )}
                          {parcel.ulpin && (
                            <Link
                              href={`/services?ulpin=${encodeURIComponent(parcel.ulpin)}`}
                              title={t.common.viewServices}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {t.common.viewServices}
                            </Link>
                          )}
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More / Pagination */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-6 py-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loading ? t.common.loading : t.search.loadMore}
                    </button>
                  </div>
                )}

                {/* Result Count */}
                <div className="mt-4 text-center text-xs text-gray-500">
                  {t.search.showingOf.replace('{a}', String(results.length)).replace('{b}', String(totalCount))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
