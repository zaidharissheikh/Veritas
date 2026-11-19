// Sticky glass top bar. The "Demo data" chip lives here but only shows for mock results.
import { h } from '../lib/dom.js';
import { demoChip } from '../components/demoChip.js';

export function topbar() {
  const chip = demoChip();
  chip.hidden = true;
  return h(
    'header',
    { className: 'topbar' },
    h(
      'div',
      { className: 'brand' },
      h('img', { className: 'brand__mark', src: '../icons/logo-tick.png', alt: '', width: 24, height: 24, 'aria-hidden': 'true' }),
      h('span', { className: 'brand__name' }, 'Veritas'),
    ),
    chip,
  );
}

export function setDemoChip(header, visible) {
  const chip = header.querySelector('.demo-chip');
  if (chip) chip.hidden = !visible;
}
