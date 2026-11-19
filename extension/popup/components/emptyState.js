// Shared layout for the unsupported / failure / error views.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

export function emptyState({ iconName, tone = 'neutral', title, message, detail, action }) {
  return h(
    'section',
    { className: `empty empty--${tone} rise`, 'aria-labelledby': 'empty-title' },
    h('div', { className: 'empty__icon', 'aria-hidden': 'true' }, icon(iconName, { size: 28 })),
    h('h2', { className: 'empty__title', id: 'empty-title' }, title),
    h('p', { className: 'empty__message' }, message),
    detail ? h('p', { className: 'empty__detail', role: 'status' }, detail) : null,
    action ? h('div', { className: 'empty__action' }, action) : null,
  );
}
