import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../../services/authApi.js';
import { clearSession, getSession, msUntilExpiry, saveSession } from '../../services/session.js';
import { AuthStateContext } from './useAuth.js';

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionEnded = useRef(false);

  // Restore a saved session once on load; getSession() already drops expired tokens.
  useEffect(() => {
    let active = true;
    async function restore() {
      const saved = getSession();
      try {
        const restored = saved ? await authApi.currentUser() : null;
        // A response from before sign-out must not restore the old session.
        if (active && getSession()?.token === saved?.token) setUser(restored);
      } catch {
        if (active && getSession()?.token === saved?.token) { clearSession(); setUser(null); }
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => { active = false; };
  }, []);

  const expireSession = useCallback(() => {
    // Effects queued before an intentional sign-out must not replace the auth page.
    if (sessionEnded.current) return;
    sessionEnded.current = true;
    clearSession();
    setUser(null);
    setSessionExpired(true);
    navigate('/login?expired=1', { replace: true });
  }, [navigate]);

  // Route guards call this on navigation, so a session that lapsed while the tab slept is caught.
  const checkSession = useCallback(() => {
    if (user && !getSession()) expireSession();
  }, [user, expireSession]);

  // Chrome can restore a document with stale React state from its back/forward cache.
  useEffect(() => {
    window.addEventListener('pageshow', checkSession);
    return () => window.removeEventListener('pageshow', checkSession);
  }, [checkSession]);

  // Sign the user out the moment the token's exp passes.
  useEffect(() => {
    if (!user) return undefined;
    const remaining = msUntilExpiry();
    if (!(remaining > 0)) {
      expireSession();
      return undefined;
    }
    const timer = setTimeout(expireSession, remaining);
    return () => clearTimeout(timer);
  }, [user, expireSession]);

  const login = useCallback(async (credentials) => {
    const { user: signedInUser, token } = await authApi.login(credentials);
    saveSession(token);
    sessionEnded.current = false;
    setSessionExpired(false);
    setUser(signedInUser);
    return signedInUser;
  }, []);

  const register = useCallback((details) => authApi.register(details), []);

  const endSession = useCallback(() => {
    sessionEnded.current = true;
    clearSession();
    setUser(null);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    endSession();
    navigate('/login', { replace: true });
  }, [endSession, navigate]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      register,
      logout,
      endSession,
      sessionExpired,
      checkSession,
    }),
    [user, loading, login, register, logout, endSession, sessionExpired, checkSession],
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}

export default AuthProvider;
