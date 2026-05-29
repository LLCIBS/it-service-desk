import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedPlatformRoute({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, inTenantContext, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-slate-500">
        Загрузка...
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/platform/login" replace />;
  }

  if (inTenantContext) {
    return <Navigate to={`/o/${user.organization?.slug ?? 'demo'}`} replace />;
  }

  return <>{children}</>;
}
