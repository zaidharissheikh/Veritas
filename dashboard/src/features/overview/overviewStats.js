// Pure helpers that turn history + diet data into the Overview's numbers.
// Lower risk is better, so a falling average is the "good" direction.

const DAY_MS = 86_400_000;

function analysedOnOrAfter(results, since) {
  return results.filter((r) => new Date(r.analyzedAt) >= since);
}

function weekAgo(now) {
  return new Date(now.getTime() - 7 * DAY_MS);
}

function startOfMonth(now) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function thisWeek(results, now = new Date()) {
  return analysedOnOrAfter(results, weekAgo(now));
}

export function thisMonth(results, now = new Date()) {
  return analysedOnOrAfter(results, startOfMonth(now));
}

export function countByType(results) {
  const article = results.filter((r) => r.contentType === 'article').length;
  return { article, video: results.length - article };
}

export function highRiskOnly(results) {
  return results.filter((r) => r.riskLevel === 'high');
}

export function newest(results, limit = 4) {
  return results.slice(0, limit);
}

export function isMockData(results) {
  return results.some((r) => r.isMock);
}

/** Whole-point change of the 30-day average vs the prior 30 days, or null. */
export function scoreDelta(diet) {
  if (!diet || diet.averageScore == null || diet.previousAverageScore == null) return null;
  return Math.round(diet.averageScore - diet.previousAverageScore);
}

function pluralPoints(n) {
  return n === 1 ? '1 pt' : `${n} pts`;
}

/** Words + icon for the delta so the trend is never conveyed by colour alone. */
export function describeDelta(delta) {
  if (delta === null) return { icon: null, tone: 'neutral', text: 'No previous period to compare' };
  if (delta === 0) return { icon: null, tone: 'neutral', text: 'Unchanged vs previous 30 days' };
  const pts = pluralPoints(Math.abs(delta));
  return delta < 0
    ? { icon: 'trending-down', tone: 'better', text: `Down ${pts} vs previous 30 days` }
    : { icon: 'trending-up', tone: 'worse', text: `Up ${pts} vs previous 30 days` };
}

export function monthName(now = new Date()) {
  return now.toLocaleDateString('en-US', { month: 'long' });
}
