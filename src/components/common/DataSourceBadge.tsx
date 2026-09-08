import { DataSource, DataSourceType } from '@/types/parcel';
import { DATA_SOURCES } from '@/config/app';

const typeLabels: Record<DataSourceType, string> = {
  REAL_OFFICIAL: 'Official Open Data',
  OPEN_DATA: 'Open Data',
  DEMONSTRATION: 'Demonstration Data',
  EXTERNAL_OPEN_DATA: 'External Open Data',
  MOCK_API: 'Mock API Data',
};

const typeColors: Record<DataSourceType, string> = {
  REAL_OFFICIAL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  OPEN_DATA: 'bg-blue-100 text-blue-800 border-blue-200',
  DEMONSTRATION: 'bg-amber-100 text-amber-800 border-amber-200',
  EXTERNAL_OPEN_DATA: 'bg-sky-100 text-sky-800 border-sky-200',
  MOCK_API: 'bg-gray-100 text-gray-800 border-gray-200',
};

const typeBadgeColors: Record<DataSourceType, string> = {
  REAL_OFFICIAL: 'bg-emerald-600',
  OPEN_DATA: 'bg-blue-600',
  DEMONSTRATION: 'bg-amber-600',
  EXTERNAL_OPEN_DATA: 'bg-sky-600',
  MOCK_API: 'bg-gray-600',
};

interface DataSourceBadgeProps {
  source: DataSource;
  showDetails?: boolean;
  compact?: boolean;
}

export function DataSourceBadge({ source, showDetails = false, compact = false }: DataSourceBadgeProps) {
  const typeLabel = typeLabels[source.type];
  const colorClass = typeColors[source.type];
  const badgeColor = typeBadgeColors[source.type];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${badgeColor}`} />
        {typeLabel}
      </span>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{source.department}</p>
          <p className="text-xs opacity-75 mt-0.5">{source.name}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${badgeColor}`}>
          {typeLabel}
        </span>
      </div>
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-current/10">
          <p className="text-xs opacity-70">Last updated: {source.lastUpdated}</p>
          <p className="text-xs opacity-70">Status: {source.status === 'active' ? 'Active' : 'Inactive'}</p>
        </div>
      )}
    </div>
  );
}

interface DataSourcePanelProps {
  sources: DataSource[];
  title?: string;
}

export function DataSourcePanel({ sources, title = 'Data Sources' }: DataSourcePanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
      <div className="space-y-2">
        {sources.map((source) => (
          <DataSourceBadge key={source.id} source={source} showDetails compact />
        ))}
      </div>
    </div>
  );
}

interface DataDisclaimerProps {
  variant?: 'banner' | 'inline';
}

export function DataDisclaimer({ variant = 'inline' }: DataDisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">Demonstration Data Notice</h4>
            <p className="text-sm text-amber-700 mt-1">
              This prototype uses demonstration and publicly available open data for development and testing purposes. Data shown may not represent actual government records.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      Demonstration Data
    </span>
  );
}
