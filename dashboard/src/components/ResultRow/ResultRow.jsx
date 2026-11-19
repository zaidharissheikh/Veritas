import { Link } from 'react-router-dom';
import { Icon } from '../Icon/Icon.jsx';
import { RiskBadge } from '../RiskBadge/RiskBadge.jsx';
import { formatRelative } from '../../lib/dates.js';
import { formatScore, riskLabel } from '../../lib/score.js';
import './ResultRow.css';

function MiniScore({ gauge }) {
  if (!gauge) return null;
  return (
    <span className="result-row__score">
      <span className="result-row__score-value tabular">{formatScore(gauge.value)}</span>
      <span className="result-row__score-label">{gauge.label}</span>
    </span>
  );
}

/**
 * One analysis in a list. The whole row is a link to its detail page.
 * Stack several rows inside a padding-less Card; separators are automatic.
 */
export function ResultRow({ result, className = '' }) {
  const isVideo = result.contentType === 'video';
  const [first, second] = result.gauges ?? [];

  return (
    <Link
      to={`/history/${result.id}`}
      className={`result-row ${className}`.trim()}
      aria-label={`${result.title}, ${result.source}, ${formatRelative(result.analyzedAt)}, ${riskLabel(result.riskLevel)}`}
    >
      <span className={`result-row__tile result-row__tile--${isVideo ? 'video' : 'article'}`}>
        <Icon name={isVideo ? 'play-video' : 'article'} size={20} />
      </span>

      <span className="result-row__body">
        <span className="result-row__title">{result.title}</span>
        <span className="result-row__meta">
          <span>{result.source}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={result.analyzedAt}>{formatRelative(result.analyzedAt)}</time>
        </span>
      </span>

      <span className="result-row__scores">
        <MiniScore gauge={first} />
        <MiniScore gauge={second} />
      </span>

      <RiskBadge level={result.riskLevel} size="sm" className="result-row__badge" />
      <Icon name="chevron-right" size={16} className="result-row__chevron" />
    </Link>
  );
}
