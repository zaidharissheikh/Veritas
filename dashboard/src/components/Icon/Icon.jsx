import { ICON_PATHS } from './paths.js';
import './Icon.css';

/**
 * Inline SVG glyph. Decorative by default (aria-hidden); pass `label` to make
 * it meaningful to screen readers.
 */
export function Icon({ name, size = 20, className = '', label, ...rest }) {
  const paths = ICON_PATHS[name] ?? ICON_PATHS.alert;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...a11y}
      {...rest}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
