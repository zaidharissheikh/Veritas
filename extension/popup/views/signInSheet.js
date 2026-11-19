// Bottom sheet that hosts the sign-in form. It enters from the bottom and leaves the same
// way (spatial consistency); Escape, the scrim and the close button all dismiss it.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { signInForm } from './signInForm.js';

const CLOSE_FALLBACK_MS = 400;
const FOCUSABLE = 'input, button, a[href]';

export function openSignInSheet({ login, onSignedIn }) {
  const opener = document.activeElement;
  let closing = false;

  const form = signInForm({
    login,
    onSignedIn: (session) => {
      close();
      onSignedIn(session);
    },
  });
  const sheet = h(
    'section',
    { className: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
    h('div', { className: 'sheet__grabber', 'aria-hidden': 'true' }),
    sheetHead(close),
    form,
  );
  const layer = h('div', { className: 'sheet-layer' }, h('div', { className: 'scrim', onclick: close }), sheet);

  document.body.appendChild(layer);
  document.body.classList.add('has-sheet');
  // On the document, not the layer: while the form is busy its inputs are disabled and
  // focus falls back to <body>, and Escape must still work then.
  document.addEventListener('keydown', onKeydown);
  form.querySelector('input').focus();

  function onKeydown(event) {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') trapFocus(event, sheet);
  }

  function close() {
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', onKeydown);
    layer.classList.add('is-closing');
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      layer.remove();
      document.body.classList.remove('has-sheet');
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
    sheet.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, CLOSE_FALLBACK_MS); // in case the exit animation never fires
  }

  return { close };
}

function sheetHead(onClose) {
  return h(
    'header',
    { className: 'sheet__head' },
    h(
      'div',
      { className: 'sheet__text' },
      h('h2', { className: 'sheet__title', id: 'sheet-title' }, 'Sign in'),
      h('p', { className: 'sheet__subtitle' }, 'Pages you check are kept in your Veritas history.'),
    ),
    h(
      'button',
      { className: 'sheet__close', type: 'button', 'aria-label': 'Close', onclick: onClose },
      h('span', { className: 'sheet__close-glyph' }, icon('close', { size: 14 })),
    ),
  );
}

// Keeps Tab inside the dialog while it is open.
function trapFocus(event, sheet) {
  const items = [...sheet.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
