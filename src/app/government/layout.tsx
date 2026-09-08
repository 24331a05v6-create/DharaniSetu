'use client';

import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { LoginForm } from '@/components/auth/LoginForm';
import { ROLE_LABELS, ROLE_DEPARTMENTS, AppRole } from '@/lib/auth';

function GovernmentLayoutInner({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut, isGovernmentUser } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-gray-600">Verifying access...</p>
      </div>
    </div>
  );

  if (!isGovernmentUser) return <LoginForm />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
              {ROLE_LABELS[profile?.role as AppRole] || 'Government'}
            </span>
            {profile?.department && (
              <span className="text-xs text-gray-500">{ROLE_DEPARTMENTS[profile?.role as AppRole] || profile.department}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{profile?.email}</span>
            <button onClick={signOut} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Sign Out</button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GovernmentLayoutInner>{children}</GovernmentLayoutInner>
    </AuthProvider>
  );
}
