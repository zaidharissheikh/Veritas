// One place that turns a service error (an Error with `.code`) into a sentence for people.
// Pages call errorMessage(error) instead of showing error.message, which may be technical.

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

const MESSAGES = {
  NETWORK_ERROR: "Can't reach the Veritas server. Is the backend running?",
  INVALID_CREDENTIALS: "That email and password don't match. Check them and try again.",
  EMAIL_TAKEN: 'An account with this email already exists. Sign in instead.',
  EMAIL_NOT_VERIFIED: 'Verify your email before signing in. Use “Resend verification email” if you need a new link.',
  EMAIL_DELIVERY_FAILED: 'We could not send the email. Please try again later, or contact the project administrator.',
  INVALID_VERIFICATION_TOKEN: 'This link is invalid, expired, or already used. Request a new verification email.',
  VERIFICATION_UNAVAILABLE: 'Email features require the backend. Disable mock mode to continue.',
  INVALID_RESET_TOKEN: 'This reset link is invalid, expired, or already used. Request a new password reset link.',
  RATE_LIMITED: 'Too many requests. Please wait a while before trying again.',
  INVALID_INPUT: 'Check your details and try again.',
  SESSION_EXPIRED: 'Your session expired. Please sign in again.',
  NOT_FOUND: 'We could not find that. It may have been removed.',
};

/** Friendly text for `error.code`; `fallback` is used for codes that have no entry. */
export function errorMessage(error, fallback = DEFAULT_MESSAGE) {
  return MESSAGES[error?.code] ?? fallback;
}
