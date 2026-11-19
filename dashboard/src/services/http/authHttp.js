// Real auth calls. Same functions and return shapes as mock/authMock.js.
import { request } from './client.js';

// Emails are matched case-insensitively by the server; passwords are sent exactly as typed.
function credentialsBody({ email, password } = {}) {
  return { email: String(email ?? '').trim(), password: String(password ?? '') };
}

/** -> User. Rejects with EMAIL_TAKEN or INVALID_INPUT. */
export async function register(credentials) {
  const { user } = await request('/auth/register', { method: 'POST', body: credentialsBody(credentials) });
  return user;
}

/** -> { user, token }. Rejects with INVALID_CREDENTIALS. */
export async function login(credentials) {
  const { user, token } = await request('/auth/login', { method: 'POST', body: credentialsBody(credentials) });
  return { user, token };
}

export const verifyEmail = (token) => request('/auth/verify-email', { method: 'POST', body: { token } });
export const resendVerification = (email) => request('/auth/resend-verification', { method: 'POST', body: { email } });
export const forgotPassword = (email) => request('/auth/forgot-password', { method: 'POST', body: { email } });
export const resetPassword = ({ token, password }) => request('/auth/reset-password', { method: 'POST', body: { token, password } });
export const currentUser = async () => (await request('/auth/me', { authenticated: true })).user;
