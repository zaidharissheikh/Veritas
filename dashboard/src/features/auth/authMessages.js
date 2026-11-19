// User-facing copy for the auth pages. Error sentences live in lib/errors.js, shared with every page.

export { DEMO_ACCOUNT } from '../../services/authApi.js';
import { errorMessage } from '../../lib/errors.js';

export const authErrorMessage = (error) => error?.code === 'INVALID_INPUT'
  ? error.message : errorMessage(error);

export const LOGIN_NOTICES = {
  registered: { icon: 'check', text: 'Check your email and verify your address before signing in.' },
  verified: { icon: 'check', text: 'Email verified. Sign in to continue.' },
  expired: { icon: 'clock', text: 'Your session expired. Please sign in again.' },
  reset: { icon: 'check', text: 'Password reset. Sign in with your new password.' },
};
