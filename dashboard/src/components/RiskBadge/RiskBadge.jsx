import { Icon } from '../Icon/Icon.jsx';
import { riskLabel } from '../../lib/score.js';
import './RiskBadge.css';

const ICON_FOR = { low: 'shield-check', medium: 'alert', high: 'alert' };

/** Tinted pill naming the risk level. Never colour alone: the words are always shown. */
export function RiskBadge({ level = 'low', size = 'md', className = '' }) {
  const safe = ICON_FOR[level] ? level : 'low';
  const classes = ['risk-badge', `risk-badge--${safe}`, `risk-badge--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      <Icon name={ICON_FOR[safe]} size={size === 'sm' ? 13 : 15} />
      <span>{riskLabel(safe)}</span>
    </span>
  );
}
