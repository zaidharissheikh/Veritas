// System-style buttons: one prominent action per view, press state, 44px hit target.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

export function button(label, { variant = 'primary', onClick, iconName, type = 'button', block = false } = {}) {
  return h(
    'button',
    { className: `btn btn--${variant}${block ? ' btn--block' : ''}`, type, onclick: onClick },
    iconName ? icon(iconName, { size: 16 }) : null,
    h('span', { className: 'btn__label' }, label),
  );
}

export function linkButton(label, { href, variant = 'plain', iconName } = {}) {
  return h(
    'a',
    { className: `btn btn--${variant}`, href, target: '_blank', rel: 'noopener noreferrer' },
    h('span', { className: 'btn__label' }, label),
    iconName ? icon(iconName, { size: 16 }) : null,
  );
}

// Swaps the label and disables the control while an async action runs.
export function setBusy(btn, busy, busyLabel) {
  const label = btn.querySelector('.btn__label');
  if (!label.dataset.idle) label.dataset.idle = label.textContent;
  label.textContent = busy ? busyLabel : label.dataset.idle;
  btn.disabled = busy;
  btn.classList.toggle('is-busy', busy);
}
