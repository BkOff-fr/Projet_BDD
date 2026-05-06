import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { Spinner } from './Spinner';

interface RequireAuthProps {
  children: ReactElement;
  /**
   * If true, the route requires the authenticated user to be a host.
   * Non-hosts are redirected to `/`.
   */
  requireHost?: boolean;
}

/**
 * Route guard. Redirects unauthenticated users to `/login`, preserving the
 * attempted path in `location.state.from` so LoginPage can return them.
 *
 * While auth state is still resolving (`isLoading`) we render a minimal
 * placeholder rather than redirecting, to avoid kicking a logged-in user to
 * `/login` on a hard refresh.
 */
export const RequireAuth = ({ children, requireHost = false }: RequireAuthProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search + location.hash }}
        replace
      />
    );
  }

  if (requireHost && !user?.isHost) {
    return <Navigate to="/" replace />;
  }

  return children;
};
