import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user, organization, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Загрузка...
      </div>
    );
  }

  if (!user || !organization) {
    return <Navigate to={`/o/${orgSlug}/login`} replace />;
  }

  if (organization.slug !== orgSlug) {
    return <Navigate to={`/o/${organization.slug}`} replace />;
  }

  return <>{children}</>;
}
