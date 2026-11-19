// The seam pages and AuthContext import. Talks to the FastAPI backend by default; set
// VITE_USE_MOCK=true to use the in-browser mock instead (see dashboard/.env.example).
import * as authHttp from './http/authHttp.js';
import * as authMock from './mock/authMock.js';
import { USE_MOCK } from './config.js';
import { apiError } from './apiError.js';
import { getSession } from './session.js';

export { DEMO_ACCOUNT } from './demoAccount.js';

const implementation = USE_MOCK ? authMock : authHttp;

function requireEmailBackend() {
  if (USE_MOCK) throw apiError('VERIFICATION_UNAVAILABLE', 'Email features require the backend. Disable mock mode to continue.');
}

export const register = (credentials) => {
  requireEmailBackend();
  return implementation.register(credentials);
};
export const login = (credentials) => implementation.login(credentials);
export const verifyEmail = (token) => { requireEmailBackend(); return authHttp.verifyEmail(token); };
export const resendVerification = (email) => { requireEmailBackend(); return authHttp.resendVerification(email); };
export const forgotPassword = (email) => { requireEmailBackend(); return authHttp.forgotPassword(email); };
export const resetPassword = (details) => { requireEmailBackend(); return authHttp.resetPassword(details); };
export const currentUser = () => USE_MOCK ? Promise.resolve(getSession()?.user ?? null) : authHttp.currentUser();
