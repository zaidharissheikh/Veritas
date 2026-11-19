// Footer: the account row (sign in / signed in) above the disclaimer and dashboard link.
// createFooter keeps one element and re-renders only the account row when the session changes.
import { h, replaceChildren } from '../lib/dom.js';
import { linkButton } from '../components/button.js';
import { accountRow } from '../components/accountRow.js';
import { openSignInSheet } from './signInSheet.js';
import { DASHBOARD_URL } from '../config.js';

export function createFooter({ getSession, login, logout, onSessionChange }) {
  const slot = h('div', { className: 'foot__account' });
  const element = h(
    'footer',
    { className: 'foot' },
    slot,
    h(
      'div',
      { className: 'foot__row' },
      h('p', { className: 'foot__note' }, 'Estimates manipulation signals, not accuracy.'),
      linkButton('Open dashboard', { href: DASHBOARD_URL, variant: 'plain', iconName: 'external-link' }),
    ),
  );

  async function refresh() {
    const session = await getSession();
    replaceChildren(slot, accountRow({ session, onSignIn: openSheet, onSignOut: signOut }));
    return session;
  }

  function openSheet() {
    openSignInSheet({
      login,
      onSignedIn: async (session) => {
        await refresh();
        onSessionChange(session);
      },
    });
  }

  async function signOut() {
    await logout();
    await refresh();
    onSessionChange(null);
  }

  return { element, refresh, openSheet };
}
