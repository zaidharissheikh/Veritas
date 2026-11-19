import { createContext, useContext } from 'react';

// The context object lives here (not in AuthContext.jsx) so that file only exports a component.
export const AuthStateContext = createContext(null);

/**
 * useAuth() -> { user, isAuthenticated, loading, login({email,password}),
 *                register({email,password}), logout() }
 * login/register return Promises that reject with an Error carrying `.code`
 * ('INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'INVALID_INPUT').
 * register does NOT sign in: the register page sends people to /check-email.
 */
export function useAuth() {
  const value = useContext(AuthStateContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
