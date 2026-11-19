import { formatDate, parseDayKey } from '../../lib/dates';
import { formatScore } from '../../lib/score';
import { countLabel } from '../../lib/text';
import './ChartTooltip.css';

// Recharts injects { active, payload } (empty buckets are filtered out before
// we get here); `weekly` comes from TrendChart.
export default function ChartTooltip({ active, payload, weekly = false }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const when = formatDate(parseDayKey(point.date));

  return (
    <div className="chart-tip">
      <p className="chart-tip__date">{weekly ? `Week of ${when}` : when}</p>
      <p className="chart-tip__value">
        <span className="chart-tip__number">{formatScore(point.avgScore)}</span>
        <span className="chart-tip__unit">average risk</span>
      </p>
      <p className="chart-tip__count">{countLabel(point.count, 'analysis', 'analyses')}</p>
    </div>
  );
}
