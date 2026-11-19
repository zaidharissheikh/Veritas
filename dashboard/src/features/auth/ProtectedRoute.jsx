import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RouteLoading } from './RouteLoading.jsx';
import { useAuth } from './useAuth.js';

// routes.jsx imports both guards from this file.
export { PublicOnlyRoute } from './PublicOnlyRoute.jsx';

// Signed-out people go to /login; the origin is kept in location state (`state.from`).
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, sessionExpired, checkSession } = useAuth();
  const location = useLocation();

  // Re-check expiry on every route change, not only when the timer fires.
  useEffect(() => {
    checkSession();
  }, [location.pathname, checkSession]);

  if (loading) return <RouteLoading />;

  if (!isAuthenticated) {
    const target = sessionExpired ? '/login?expired=1' : '/login';
    return <Navigate to={target} replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
