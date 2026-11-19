// Honest "Demo data" marker shown wherever mock scores appear (CONTRACTS §1).
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

export function demoChip() {
  return h(
    'span',
    { className: 'demo-chip', title: 'Scores come from a simulated analysis service, not the real model.' },
    icon('sparkle', { size: 12 }),
    'Demo data',
  );
}
