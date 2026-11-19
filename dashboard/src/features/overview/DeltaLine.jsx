import { Icon } from '../../components';
import './DeltaLine.css';

/** Trend icon + words for a score delta (see overviewStats.describeDelta). */
export function DeltaLine({ delta }) {
  return (
    <span className={`delta-line delta-line--${delta.tone}`}>
      {delta.icon && <Icon name={delta.icon} size={16} className="delta-line__icon" />}
      <span>{delta.text}</span>
    </span>
  );
}
