'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { NAVIGATION } from '@/config/app';
import { useAuth } from '@/components/auth/AuthProvider';
import { ROLE_LABELS, AppRole } from '@/lib/auth';
import { useLanguage } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, loading, signOut, isGovernmentUser, user } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const NAV_LABELS: Record<string, string> = {
    Home: t.nav.home,
    'Search Parcel': t.nav.searchParcel,
    'GIS Explorer': t.nav.gisExplorer,
    Services: t.nav.services,
    About: t.nav.about,
  };

  const langSelect = (id: string, extraClass: string) => (
    <select
      id={id}
      aria-label={t.nav.language}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className={`text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${extraClass}`}
    >
      {LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>{l.nativeLabel}</option>
      ))}
    </select>
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const res = await fetch(`/api/v1/notifications?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? data);
      }
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAllAsRead() {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch(`/api/v1/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
    } catch {
      // silently fail
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-blue-900 tracking-tight">DharaniSetu</span>
              <span className="hidden sm:inline text-xs text-gray-500 ml-2 font-medium">Step 1 Prototype</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAVIGATION.public.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {NAV_LABELS[item.label] || item.label}
              </Link>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <Link
              href="/government"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/government')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t.nav.government}
            </Link>
            {langSelect('lang-desktop', 'px-2 py-1.5 ml-1')}

            {!loading && (
              <div className="ml-2 flex items-center gap-2">
                {isGovernmentUser && profile ? (
                  <>
                    {user && (
                      <div className="relative" ref={notifRef}>
                        <button
                          onClick={() => setNotifOpen(!notifOpen)}
                          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          aria-label={t.nav.notifications}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4.5 h-4.5 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </button>

                        {notifOpen && (
                          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                              <h3 className="text-sm font-semibold text-gray-900">{t.nav.notifications}</h3>
                              {unreadCount > 0 && (
                                <button
                                  onClick={markAllAsRead}
                                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  {t.nav.markAllRead}
                                </button>
                              )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                              {notifLoading ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">{t.nav.loading}</div>
                              ) : notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">{t.nav.noNotifications}</div>
                              ) : (
                                notifications.map((n) => (
                                  <div
                                    key={n.id}
                                    className={`px-4 py-3 border-b border-gray-50 last:border-0 ${
                                      n.read ? 'bg-white' : 'bg-blue-50/50'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {!n.read && (
                                        <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                      )}
                                      <div className="min-w-0">
                                        <p className={`text-sm ${n.read ? 'text-gray-700' : 'font-medium text-gray-900'}`}>
                                          {n.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                        <p className="text-[11px] text-gray-400 mt-1">
                                          {new Date(n.created_at).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                      {ROLE_LABELS[profile.role as AppRole]}
                    </span>
                    <button
                      onClick={signOut}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
                    >
                      {t.nav.signOut}
                    </button>
                  </>
                ) : (
                    <Link
                      href="/government"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200"
                    >
                      {t.nav.signIn}
                    </Link>
                )}
              </div>
            )}
          </nav>

          <button
            type="button"
            aria-label={mobileMenuOpen ? t.common.close : 'Menu'}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {NAVIGATION.public.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {NAV_LABELS[item.label] || item.label}
              </Link>
            ))}
            <div className="border-t border-gray-200 pt-1 mt-1">
              <Link
                href="/government"
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname.startsWith('/government')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.govDashboard}
              </Link>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-1 px-3">
              {langSelect('lang-mobile', 'px-2 py-1.5 w-full')}
            </div>
            {!loading && (
              <div className="border-t border-gray-200 pt-2 mt-1">
                {isGovernmentUser && profile ? (
                  <div className="px-3 py-2">
                    {user && (
                      <div className="relative mb-3">
                        <button
                          onClick={() => setNotifOpen(!notifOpen)}
                          className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 w-full"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          Notifications
                          {unreadCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </button>
                        {notifOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                              <h3 className="text-sm font-semibold text-gray-900">{t.nav.notifications}</h3>
                              {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                                  {t.nav.markAllRead}
                                </button>
                              )}
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {notifLoading ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">{t.nav.loading}</div>
                              ) : notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">{t.nav.noNotifications}</div>
                              ) : (
                                notifications.map((n) => (
                                  <div key={n.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${n.read ? 'bg-white' : 'bg-blue-50/50'}`}>
                                    <div className="flex items-start gap-2">
                                      {!n.read && <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                                      <div className="min-w-0">
                                        <p className={`text-sm ${n.read ? 'text-gray-700' : 'font-medium text-gray-900'}`}>{n.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                        <p className="text-[11px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{t.nav.signedInAs}</p>
                    <p className="text-sm font-medium text-gray-900">{profile.email}</p>
                    <p className="text-xs text-blue-600">{ROLE_LABELS[profile.role as AppRole]}</p>
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="mt-2 text-sm text-red-600 font-medium"
                    >
                      {t.nav.signOut}
                    </button>
                  </div>
                ) : (
                    <Link
                      href="/government"
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t.nav.signIn}
                    </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
