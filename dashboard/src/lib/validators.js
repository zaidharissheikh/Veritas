// Form validation for the auth pages. Each validator returns a friendly message or null.

import { validateEmail } from './emailValidation.js';
export { validateEmail } from './emailValidation.js';

const PASSWORD_MIN_LENGTH = 8;

const hasLetter = (value) => /[A-Za-z]/.test(value);
const hasNumber = (value) => /\d/.test(value);
const hasWhitespace = (value) => /[\s\u001c-\u001f\u0085]/u.test(value);

export function validatePassword(password) {
  const value = password ?? '';
  if (!value) return 'Enter a password.';
  if (hasWhitespace(value)) return 'Passwords cannot contain spaces or other whitespace.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(value).length > 72) return 'Use at most 72 bytes (some characters use more than one).';
  if (!hasLetter(value) || !hasNumber(value)) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

// Live checklist shown under the password field on the register page.
export function passwordChecks(password) {
  const value = password ?? '';
  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, ok: value.length >= PASSWORD_MIN_LENGTH },
    { label: 'Contains a letter', ok: hasLetter(value) },
    { label: 'Contains a number', ok: hasNumber(value) },
    { label: 'No spaces or other whitespace', ok: Boolean(value) && !hasWhitespace(value) },
  ];
}

function collectErrors(checks) {
  const errors = {};
  for (const [field, message] of Object.entries(checks)) {
    if (message) errors[field] = message;
  }
  return errors;
}

// Login only checks presence + email shape: the password rules apply when choosing one.
export function validateLoginForm({ email, password } = {}) {
  return collectErrors({
    email: validateEmail(email),
    password: password ? null : 'Enter your password.',
  });
}

export function validateRegisterForm({ email, password } = {}) {
  return collectErrors({
    email: validateEmail(email),
    password: validatePassword(password),
  });
}

export function validateResetForm({ password, confirmPassword } = {}) {
  return collectErrors({
    password: validatePassword(password),
    confirmPassword: !confirmPassword ? 'Confirm your new password.'
      : password === confirmPassword ? null : 'The passwords do not match.',
  });
}
