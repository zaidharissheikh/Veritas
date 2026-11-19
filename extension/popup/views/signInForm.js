// Email + password form inside the sign-in sheet. Errors show inline, the button shows
// its busy state, and account creation/password recovery hand off to the dashboard.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { button, setBusy } from '../components/button.js';
import { DASHBOARD_URL } from '../config.js';

const MESSAGES = {
  EMPTY: 'Enter your email and password.',
  INVALID_CREDENTIALS: "That email and password don't match.",
  EMAIL_NOT_VERIFIED: 'Verify your email first. Open the dashboard sign-in page to resend the verification link.',
  INVALID_INPUT: 'Check your email address and password, then try again.',
};
const FALLBACK_MESSAGE = "Couldn't sign you in. Try again in a moment.";

export function signInForm({ login, onSignedIn }) {
  const email = input({ type: 'email', name: 'email', autocomplete: 'email', placeholder: 'you@example.com' });
  const password = input({ type: 'password', name: 'password', autocomplete: 'current-password', placeholder: 'Password' });
  const errorText = h('span', { className: 'form__error-text' });
  const error = h('p', { className: 'form__error', role: 'alert', hidden: true }, icon('alert', { size: 14 }), errorText);
  const submit = button('Sign in', { type: 'submit', block: true });

  const form = h(
    'form',
    { className: 'form', novalidate: true, onsubmit: handleSubmit },
    h('div', { className: 'field-group' }, field('Email', email), field('Password', password)),
    error,
    submit,
    h('p', { className: 'form__alt' },
      h('a', { href: `${DASHBOARD_URL}/forgot-password`, target: '_blank', rel: 'noopener noreferrer' }, 'Forgot password?')),
    h(
      'p',
      { className: 'form__alt' },
      'New to Veritas? ',
      h('a', { href: `${DASHBOARD_URL}/register`, target: '_blank', rel: 'noopener noreferrer' }, 'Create an account'),
    ),
  );

  async function handleSubmit(event) {
    event.preventDefault();
    const credentials = { email: email.value.trim(), password: password.value };
    if (!credentials.email || !credentials.password) return showError(MESSAGES.EMPTY);
    hideError();
    setFormBusy(true);
    try {
      onSignedIn(await login(credentials));
    } catch (err) {
      setFormBusy(false);
      showError(MESSAGES[err.code] || err.message || FALLBACK_MESSAGE);
    }
  }

  function setFormBusy(busy) {
    setBusy(submit, busy, 'Signing in…');
    email.disabled = busy;
    password.disabled = busy;
  }

  function showError(message) {
    errorText.textContent = message;
    error.hidden = false;
    [email, password].forEach((el) => el.setAttribute('aria-invalid', 'true'));
    (email.value.trim() ? password : email).focus();
  }

  function hideError() {
    error.hidden = true;
    [email, password].forEach((el) => el.removeAttribute('aria-invalid'));
  }

  return form;
}

function input(props) {
  return h('input', { className: 'field__input', required: true, ...props });
}

function field(label, control) {
  return h('label', { className: 'field' }, h('span', { className: 'field__label' }, label), control);
}
