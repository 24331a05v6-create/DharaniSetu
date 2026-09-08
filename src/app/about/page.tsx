import Link from 'next/link';
import { DataDisclaimer } from '@/components/common/DataSourceBadge';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">About DharaniSetu</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Understanding the vision behind connected land governance.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Vision */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vision</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-700 leading-relaxed">
              DharaniSetu envisions a future where every piece of land in India has a single, unified digital identity.
              By connecting fragmented land-related datasets from Revenue, Registration, Planning, Property Tax,
              Utilities, and Restrictions through a common parcel identity (ULPIN), we aim to create a transparent,
              efficient, and accessible land governance system.
            </p>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Problem Statement</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-700 leading-relaxed mb-4">
              Land records in India are fragmented across multiple departments with different systems,
              terminologies, and data formats. This creates:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>Data inconsistency across departments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>Difficulty in verifying land ownership and history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>Time-consuming manual verification processes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>Lack of transparency in land transactions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>Citizens navigating multiple offices for information</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Solution */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Our Approach</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Unified Parcel Identity</h3>
                  <p className="text-sm text-gray-600 mt-1">Every parcel gets a ULPIN - a single digital identity across all departments.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Department Interoperability</h3>
                  <p className="text-sm text-gray-600 mt-1">Connect Revenue, Registration, Planning, Tax, Utilities, and other departments through standard APIs.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Unified Land Profile</h3>
                  <p className="text-sm text-gray-600 mt-1">A single view of all land information for citizens and government officials.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">4</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">GIS-Based Intelligence</h3>
                  <p className="text-sm text-gray-600 mt-1">Spatial data, cadastral maps, and parcel boundaries for every piece of land.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Technology Stack</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { name: 'Next.js', category: 'Frontend' },
                { name: 'React', category: 'Frontend' },
                { name: 'TypeScript', category: 'Language' },
                { name: 'Tailwind CSS', category: 'Styling' },
                { name: 'MapLibre GL JS', category: 'GIS' },
                { name: 'PostgreSQL + PostGIS', category: 'Database' },
                { name: 'Supabase', category: 'Backend' },
                { name: 'Supabase Auth', category: 'Authentication' },
              ].map((tech) => (
                <div key={tech.name} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{tech.name}</p>
                  <p className="text-xs text-gray-500">{tech.category}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Current Status */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Status</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">Step 1: UI Foundation & Architecture (Completed)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">Step 2: Database & Search (Completed)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-500">Step 3: AI Integration (Planned)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-500">Step 4: Production Deployment (Planned)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Sources</h2>
          <DataDisclaimer variant="banner" />
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-700 mb-4">
              DharaniSetu is designed to integrate with real government data sources where legally and publicly accessible:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">•</span>
                <span>Official Revenue Department portals and APIs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">•</span>
                <span>Registration Department records</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">•</span>
                <span>Cadastral and geospatial datasets</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">•</span>
                <span>Open government datasets</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">•</span>
                <span>OpenStreetMap and other open data sources</span>
              </li>
            </ul>
          </div>
        </section>

        {/* SIH */}
        <section className="mb-12">
          <div className="bg-blue-900 text-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-2">Smart India Hackathon</h2>
            <p className="text-blue-200 text-sm">
              DharaniSetu is developed as a prototype for the Government of India&apos;s Land Stack problem statement
              at Smart India Hackathon. The working implementation includes the UI foundation, live Supabase
              PostgreSQL + PostGIS database with parcel search, GIS visualization, parcel profiles, citizen
              services, and multilingual support.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
