// Quiet line under the scores: "Saved to your history" with a link to the dashboard entry,
// or, when the result was not saved, a nudge to sign in (UC-04).
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { DASHBOARD_URL } from '../config.js';

export function historyNote(result, { signIn }) {
  return result.saved ? savedNote(result) : nudge(signIn);
}

function savedNote(result) {
  const href = `${DASHBOARD_URL}/history/${encodeURIComponent(result.id)}`;
  return h(
    'p',
    { className: 'note note--saved' },
    icon('check', { size: 14, className: 'note__icon' }),
    h('span', { className: 'note__text' }, 'Saved to your history'),
    h(
      'a',
      { className: 'note__link', href, target: '_blank', rel: 'noopener noreferrer' },
      'View',
      icon('external-link', { size: 12 }),
    ),
  );
}

function nudge(signIn) {
  return h(
    'p',
    { className: 'note note--nudge' },
    icon('history', { size: 14, className: 'note__icon' }),
    h('span', { className: 'note__text' }, 'Not saved to your history'),
    h('button', { className: 'note__link', type: 'button', onclick: signIn }, 'Sign in'),
  );
}
