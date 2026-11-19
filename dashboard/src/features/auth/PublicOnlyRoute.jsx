import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RouteLoading } from './RouteLoading.jsx';
import { useAuth } from './useAuth.js';

// Entering either auth form ends the session while preserving the current URL/history.
export function PublicOnlyRoute({ children }) {
  const { loading, endSession } = useAuth();
  const location = useLocation();

  useLayoutEffect(() => {
    endSession();
    window.addEventListener('pageshow', endSession);
    return () => window.removeEventListener('pageshow', endSession);
  }, [endSession, location.pathname]);

  if (loading) return <RouteLoading />;

  return children ?? <Outlet />;
}

export default PublicOnlyRoute;
