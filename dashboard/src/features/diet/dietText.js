// Plain-language copy and small pure helpers for the Information Diet page.
import { PERIOD_OPTIONS } from '../../lib/dates';
import { riskLevelFor } from '../../lib/score';
import { countLabel } from '../../lib/text';

export const DEFAULT_PERIOD = '30d';

const READINGS = {
  low: 'Your diet is mostly low-risk.',
  medium: 'Your diet has a moderate share of manipulative content.',
  high: 'Your diet leans heavily on high-risk content.',
};

// Lower scores are better: a drop in average risk is an improvement.
const STEADY_BAND = 2;

export function readingFor(averageScore) {
  return READINGS[riskLevelFor(averageScore)];
}

export function periodLabel(period) {
  const option = PERIOD_OPTIONS.find((o) => o.value === period);
  return option ? option.label.toLowerCase() : period;
}

export function deltaFor(averageScore, previousAverageScore) {
  if (!Number.isFinite(previousAverageScore)) return null;
  const change = Math.round(averageScore - previousAverageScore) || 0;
  if (Math.abs(change) < STEADY_BAND) return { change, direction: 'steady', word: 'Steady' };
  if (change < 0) return { change, direction: 'down', word: 'Improved' };
  return { change, direction: 'up', word: 'Worsened' };
}

export function deltaSentence(delta, period) {
  const previous = `the previous ${periodLabel(period)}`;
  if (delta.direction === 'steady') return `about the same as ${previous}`;
  const points = countLabel(Math.abs(delta.change), 'point');
  return `${points} ${delta.change < 0 ? 'lower' : 'higher'} than ${previous}`;
}

export function percentOf(part, total) {
  if (!total) return 0;
  return Math.round(((part || 0) / total) * 100);
}

// getDiet buckets per day for 7d/30d and per week for 90d/all.
export function isWeekly(period) {
  return period === '90d' || period === 'all';
}
