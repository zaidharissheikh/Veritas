import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../components';
import { formatDate, parseDayKey } from '../../lib/dates';
import { RISK_THRESHOLDS, formatScore } from '../../lib/score';
import { isWeekly } from './dietText';
import { useChartTheme } from './useChartTheme';
import ChartTooltip from './ChartTooltip.jsx';
import './TrendChart.css';

const Y_TICKS = [0, 50, 100];
const PLOT_HEIGHT = 260;

function shortDate(key) {
  return parseDayKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// A text twin of the chart for screen readers (HIG: describe what the chart
// represents, with actual values rather than adjectives).
function describeTrend(points, weekly) {
  const filled = points.filter((p) => p.avgScore != null);
  const first = filled[0];
  const last = filled[filled.length - 1];
  const unit = weekly ? 'week' : 'day';
  return `Average risk per ${unit}, 0 to 100. ${formatScore(first.avgScore)} on ${formatDate(parseDayKey(first.date))}, ` +
    `${formatScore(last.avgScore)} on ${formatDate(parseDayKey(last.date))}. Moderate risk starts at ${RISK_THRESHOLDS.medium}, ` +
    `high risk at ${RISK_THRESHOLDS.high}.`;
}

export default function TrendChart({ points = [], period }) {
  const theme = useChartTheme();
  const weekly = isWeekly(period);
  const hasData = points.some((p) => p.avgScore != null);

  return (
    <Card className="diet-trend" padding="lg">
      <header className="diet-card__head">
        <h2 className="diet-card__title">Average risk over time</h2>
        <p className="diet-card__caption">
          {weekly ? 'Weekly' : 'Daily'} average of the manipulation-likelihood score. Lower is better.
        </p>
      </header>
      {hasData ? (
        <div className="diet-trend__plot" role="img" aria-label={describeTrend(points, weekly)}>
          <ResponsiveContainer width="100%" height={PLOT_HEIGHT}>
            <AreaChart data={points} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="diet-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.accent} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={theme.separator} strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                axisLine={false}
                tickLine={false}
                tick={{ fill: theme.label2, fontSize: 12 }}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis
                orientation="right"
                domain={[0, 100]}
                ticks={Y_TICKS}
                axisLine={false}
                tickLine={false}
                tick={{ fill: theme.label2, fontSize: 12 }}
                width={32}
              />
              <ReferenceLine {...thresholdProps(RISK_THRESHOLDS.medium, theme.riskMedium, 'Moderate', theme)} />
              <ReferenceLine {...thresholdProps(RISK_THRESHOLDS.high, theme.riskHigh, 'High', theme)} />
              <Tooltip
                content={<ChartTooltip weekly={weekly} />}
                cursor={{ stroke: theme.separator, strokeWidth: 1 }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="avgScore"
                name="Average risk"
                connectNulls
                stroke={theme.accent}
                strokeWidth={2}
                strokeLinecap="round"
                fill="url(#diet-trend-fill)"
                dot={false}
                activeDot={{ r: 5, fill: theme.accent, stroke: theme.surface, strokeWidth: 2 }}
                isAnimationActive={!theme.reducedMotion}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="diet-card__quiet">Not enough analyses in this period to draw a trend.</p>
      )}
    </Card>
  );
}

// Props only: recharts finds chart children by element type, so a wrapper
// component around <ReferenceLine> would be ignored. Dashed on purpose —
// thresholds mark a boundary, not a grid line.
function thresholdProps(y, stroke, levelName, theme) {
  return {
    y,
    stroke,
    strokeOpacity: 0.55,
    strokeDasharray: '3 5',
    label: { value: `${levelName} from ${y}`, position: 'insideTopLeft', fill: theme.label2, fontSize: 11 },
  };
}
