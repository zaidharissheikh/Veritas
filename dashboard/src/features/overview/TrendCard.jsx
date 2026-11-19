import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { Card, Icon } from '../../components';
import { formatScore } from '../../lib/score.js';
import { TrendTooltip } from './TrendTooltip.jsx';
import './TrendCard.css';

const CHART_HEIGHT = 96;

function chartSummary(points, averageScore) {
  const days = points.filter((p) => p.avgScore != null).length;
  return `Area chart of the daily average risk score over the last 30 days, ${days} days with data, overall average ${formatScore(averageScore)} out of 100.`;
}

function Sparkline({ points }) {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={points} margin={{ top: 6, right: 2, bottom: 0, left: 2 }}>
        <YAxis hide domain={[0, 100]} />
        <Tooltip
          content={<TrendTooltip />}
          cursor={{ stroke: 'var(--separator)', strokeWidth: 1 }}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="avgScore"
          connectNulls
          stroke="var(--accent)"
          strokeWidth={2}
          fill="var(--accent-tint)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Compact 30-day sparkline with a link through to the full Information Diet. */
export function TrendCard({ points = [], averageScore, delta, className = '', ...rest }) {
  const hasData = points.some((p) => p.avgScore != null);
  return (
    <Card className={`trend-card ${className}`.trim()} aria-labelledby="trend-title" {...rest}>
      <div className="trend-card__head">
        <div className="trend-card__text">
          <h2 id="trend-title" className="trend-card__title">
            Risk trend
          </h2>
          <p className="trend-card__sub">{hasData ? delta.text : 'Daily average, last 30 days'}</p>
        </div>
        <Link to="/diet" className="trend-card__link">
          View Information Diet
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>

      <div className="trend-card__chart" style={{ height: CHART_HEIGHT }}>
        {hasData ? (
          <Sparkline points={points} />
        ) : (
          <p className="trend-card__empty">No analyses in the last 30 days.</p>
        )}
      </div>
      {hasData && <p className="sr-only">{chartSummary(points, averageScore)}</p>}
    </Card>
  );
}
