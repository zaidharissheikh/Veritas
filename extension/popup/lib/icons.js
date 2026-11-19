// Inline SF-Symbols-like icons, 24-unit grid, 1.5px stroke.
import { svg } from './dom.js';

const PATHS = {
  'shield-check': ['M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z', 'M9 12l2 2 4-4'],
  article: ['M7 4h7l4 4v12H7z', 'M14 4v4h4', 'M10 13h5', 'M10 16h5'],
  play: ['M5 7.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z', 'M10.5 9.5v5l4-2.5z'],
  alert: ['M12 3.5l9 16H3z', 'M12 10v4', 'M12 17h.01'],
  globe: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18', 'M12 3c2.5 2.7 2.5 15.3 0 18', 'M12 3c-2.5 2.7-2.5 15.3 0 18'],
  'cloud-off': ['M7 17h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10-1.5A3.9 3.9 0 0 0 7 17z', 'M4 4l16 16'],
  'external-link': ['M14 4h6v6', 'M20 4l-9 9', 'M18 13v6H5V6h6'],
  copy: ['M9 9h10v10H9z', 'M5 15V5h10'],
  chevron: ['M9 6l6 6-6 6'],
  refresh: ['M20 11a8 8 0 0 0-14.5-3.5', 'M4 13a8 8 0 0 0 14.5 3.5', 'M5 3v5h5', 'M19 21v-5h-5'],
  sparkle: ['M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z'],
  quote: ['M7 8h4v4H7v3a2 2 0 0 1-2 2', 'M15 8h4v4h-4v3a2 2 0 0 1-2 2'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  history: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4 4v4.5h4.5', 'M12 8v4.5l3 1.8'],
};

export function icon(name, { size = 20, className = '' } = {}) {
  const paths = PATHS[name] || PATHS.sparkle;
  return svg(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
      className: `icon ${className}`.trim(),
    },
    ...paths.map((d) => svg('path', { d })),
  );
}
