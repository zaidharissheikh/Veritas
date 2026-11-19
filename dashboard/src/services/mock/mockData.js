import { DEMO_ACCOUNT } from '../demoAccount.js';
import { generateHistory } from './generator.js';

// Only the demo account has a history; every other account starts empty so
// the empty states get exercised.
export const DEMO_EMAIL = DEMO_ACCOUNT.email;

const cache = new Map();

/** Deterministic AnalysisResult[] for a user (newest first). */
export function historyForUser(email) {
  const key = (email ?? '').toLowerCase();
  if (key !== DEMO_EMAIL) return [];
  if (!cache.has(key)) cache.set(key, generateHistory());
  return cache.get(key);
}

/** A handful of results for component previews and the /_kit page. */
export function sampleResults(count = 4) {
  return historyForUser(DEMO_EMAIL).slice(0, count);
}
