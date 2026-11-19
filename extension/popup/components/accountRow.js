// Footer account cell (inset-grouped list idiom): signed out it is one tappable row that
// opens the sign-in sheet; signed in it shows the email and a Sign out action.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { button } from './button.js';

export function accountRow({ session, onSignIn, onSignOut }) {
  return session ? signedInRow(session, onSignOut) : signedOutRow(onSignIn);
}

function signedOutRow(onSignIn) {
  return h(
    'button',
    { className: 'account account--out', type: 'button', onclick: onSignIn },
    avatar(),
    h('span', { className: 'account__text' }, 'Sign in to save to your history'),
    icon('chevron', { size: 16, className: 'account__chevron' }),
  );
}

function signedInRow(session, onSignOut) {
  const email = (session.user && session.user.email) || 'Signed in';
  return h(
    'div',
    { className: 'account account--in' },
    avatar(),
    h('span', { className: 'account__text', title: email }, email),
    button('Sign out', { variant: 'plain', onClick: onSignOut }),
  );
}

function avatar() {
  return h('span', { className: 'account__icon', 'aria-hidden': 'true' }, icon('person', { size: 16 }));
}
