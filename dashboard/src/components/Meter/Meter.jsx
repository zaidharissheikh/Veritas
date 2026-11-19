import { clampScore } from '../../lib/score.js';
import './Meter.css';

/**
 * Thin horizontal bar for a 0–100 value. With a `label` it is announced as a
 * progressbar; without one it is decorative (the number is shown next to it).
 * `color` is any CSS colour, usually a token: 'var(--accent)'.
 */
export function Meter({ value = 0, label, color = 'var(--accent)', size = 'md', className = '' }) {
  const pct = clampScore(value);
  const a11y = label
    ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct) }
    : { 'aria-hidden': true };

  return (
    <div className={`meter meter--${size} ${className}`.trim()} {...a11y}>
      <span className="meter__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
