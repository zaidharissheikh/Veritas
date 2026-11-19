import { dayKey, periodStart, previousPeriodRange, weekKey } from '../../lib/dates.js';
import { normaliseToken } from './terms.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKLY_PERIODS = new Set(['90d', 'all']);
const MAX_TERMS = 30;

function average(values) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function inRange(result, start, end) {
  const t = new Date(result.analyzedAt).getTime();
  return (!start || t >= start.getTime()) && (!end || t < end.getTime());
}

/** Every bucket in the window, oldest first; empty buckets have avgScore null. */
function bucketKeys(period, results, now) {
  const weekly = WEEKLY_PERIODS.has(period);
  const keyFor = weekly ? weekKey : dayKey;
  const step = weekly ? 7 * DAY_MS : DAY_MS;
  const oldest = results.length ? Math.min(...results.map((r) => new Date(r.analyzedAt).getTime())) : now;
  const start = periodStart(period, now)?.getTime() ?? oldest;

  const keys = [];
  for (let t = start; t <= now; t += step) keys.push(keyFor(t));
  const last = keyFor(now);
  if (keys[keys.length - 1] !== last) keys.push(last);
  return { keys: [...new Set(keys)], keyFor };
}

function buildPoints(period, results, now) {
  const { keys, keyFor } = bucketKeys(period, results, now);
  const scores = new Map(keys.map((k) => [k, []]));
  results.forEach((r) => scores.get(keyFor(r.analyzedAt))?.push(r.riskScore));
  return keys.map((date) => ({
    date,
    avgScore: average(scores.get(date)),
    count: scores.get(date).length,
  }));
}

function countBy(results, pickKey, keys) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  results.forEach((r) => {
    counts[pickKey(r)] = (counts[pickKey(r)] ?? 0) + 1;
  });
  return counts;
}

/** Merge highlights across results: one row per term, weight = mean, count = occurrences. */
function topTerms(results) {
  const byTerm = new Map();
  results.forEach((r) =>
    (r.highlights ?? []).forEach((h) => {
      const key = normaliseToken(h.token);
      const row = byTerm.get(key) ?? { term: key, kind: h.kind, count: 0, total: 0 };
      row.count += 1;
      row.total += h.weight;
      byTerm.set(key, row);
    }),
  );
  return [...byTerm.values()]
    .map(({ term, kind, count, total }) => ({ term, kind, count, weight: Number((total / count).toFixed(2)) }))
    .sort((a, b) => b.count * b.weight - a.count * a.weight || a.term.localeCompare(b.term))
    .slice(0, MAX_TERMS);
}

export function aggregateDiet(allResults, period, now = Date.now()) {
  const start = periodStart(period, now);
  const current = allResults.filter((r) => inRange(r, start, null));
  const prev = previousPeriodRange(period, now);
  const previous = prev ? allResults.filter((r) => inRange(r, prev.start, prev.end)) : [];

  return {
    points: buildPoints(period, current, now),
    riskMix: countBy(current, (r) => r.riskLevel, ['low', 'medium', 'high']),
    byType: countBy(current, (r) => r.contentType, ['article', 'video']),
    averageScore: average(current.map((r) => r.riskScore)) ?? 0,
    previousAverageScore: prev ? average(previous.map((r) => r.riskScore)) : null,
    totalAnalyses: current.length,
    topTerms: topTerms(current),
    isMock: true, // lets the Diet page show its "Demo data" chip
  };
}
