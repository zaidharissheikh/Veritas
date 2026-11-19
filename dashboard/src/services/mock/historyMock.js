// Mock history API, used only when VITE_USE_MOCK=true. Mirrors http/historyHttp.js.
import { apiError } from '../apiError.js';
import { getSession } from '../session.js';
import { periodStart } from '../../lib/dates.js';
import { delay } from './delay.js';
import { historyForUser } from './mockData.js';
import { aggregateDiet } from './dietAggregate.js';

function requireSession() {
  const session = getSession();
  if (!session) throw apiError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  return session;
}

function matchesType(result, type) {
  return !type || type === 'all' || result.contentType === type;
}

function matchesPeriod(result, period) {
  const start = periodStart(period);
  return !start || new Date(result.analyzedAt) >= start;
}

function matchesQuery(result, query) {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return true;
  return result.title.toLowerCase().includes(q) || result.source.toLowerCase().includes(q);
}

/** Newest first, filtered by content type, time period and free-text query. */
export async function listHistory({ type = 'all', period = 'all', query = '' } = {}) {
  const { user } = requireSession();
  await delay();
  return historyForUser(user.email).filter(
    (r) => matchesType(r, type) && matchesPeriod(r, period) && matchesQuery(r, query),
  );
}

export async function getAnalysis(id) {
  const { user } = requireSession();
  await delay();
  const result = historyForUser(user.email).find((r) => r.id === id);
  if (!result) throw apiError('NOT_FOUND', 'This analysis could not be found.');
  return result;
}

/** Per-day buckets for 7d/30d, per-week for 90d/all. Empty buckets have avgScore null. */
export async function getDiet({ period = '30d' } = {}) {
  const { user } = requireSession();
  await delay();
  return aggregateDiet(historyForUser(user.email), period);
}
