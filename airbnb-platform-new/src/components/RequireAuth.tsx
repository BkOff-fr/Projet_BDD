import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';

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
        <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireHost && !user?.isHost) {
    return <Navigate to="/" replace />;
  }

  return children;
};
