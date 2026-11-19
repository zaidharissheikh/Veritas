// Pill badge with a coloured dot and a text label — risk is never colour-only.
import { h } from '../lib/dom.js';
import { riskLabel } from '../lib/score.js';

export function riskBadge(level) {
  return h(
    'span',
    { className: 'risk-badge', 'data-level': level },
    h('span', { className: 'risk-badge__dot', 'aria-hidden': 'true' }),
    riskLabel(level),
  );
}
