'use client';

import Link from 'next/link';
import { APP_CONFIG } from '@/config/app';
import { useLanguage } from '@/i18n';

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">DharaniSetu</span>
            </div>
            <p className="text-sm text-gray-400 max-w-md">
              {APP_CONFIG.description}
            </p>
            <p className="text-xs text-gray-500 mt-3">
              SIH {new Date().getFullYear()} Prototype - Government of India Land Stack
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">{t.footer.platform}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="hover:text-white transition-colors">{t.nav.searchParcel}</Link></li>
              <li><Link href="/gis-explorer" className="hover:text-white transition-colors">{t.nav.gisExplorer}</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">{t.nav.services}</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">{t.nav.about}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">{t.footer.government}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/government" className="hover:text-white transition-colors">{t.footer.dashboard}</Link></li>
              <li><span className="text-gray-500">Data Integration</span></li>
              <li><span className="text-gray-500">Analytics</span></li>
              <li><span className="text-gray-500">Verification</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">
              {APP_CONFIG.isPrototype && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/30 text-amber-400 text-xs font-medium mr-3">
                  Step 1 Prototype
                </span>
              )}
              {t.footer.prototypeNote}
            </p>
            <p className="text-xs text-gray-500">
              Built for Smart India Hackathon
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
