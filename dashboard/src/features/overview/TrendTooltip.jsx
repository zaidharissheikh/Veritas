import { formatDate, parseDayKey } from '../../lib/dates.js';
import { formatScore } from '../../lib/score.js';

/** Minimal recharts tooltip: date on one line, score on the next. */
export function TrendTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  if (point.avgScore == null) return null;
  return (
    <div className="trend-tip" role="status">
      <span className="trend-tip__date">{formatDate(parseDayKey(point.date))}</span>
      <span className="trend-tip__score tabular">{formatScore(point.avgScore)}</span>
    </div>
  );
}
