// Real history calls. Same functions and return shapes as mock/historyMock.js.
import { request } from './client.js';

/** AnalysisResult[], newest first. */
export function listHistory({ type = 'all', period = 'all', query = '' } = {}) {
  return request('/history', { authenticated: true, query: { type, period, query: query.trim() } });
}

/** One AnalysisResult; rejects with NOT_FOUND (also for another user's id). */
export function getAnalysis(id) {
  return request(`/history/${encodeURIComponent(id)}`, { authenticated: true });
}

// /diet only returns aggregates, so ask the list whether any row behind them is seeded demo data.
async function hasDemoRows(period) {
  const rows = await listHistory({ period });
  return rows.some((row) => row.isMock);
}

/** Information Diet aggregates for a period (CONTRACTS §6 getDiet) plus `isMock` for the chip. */
export async function getDiet({ period = '30d' } = {}) {
  const diet = await request('/diet', { authenticated: true, query: { period } });
  if (diet.totalAnalyses === 0) return diet;
  return { ...diet, isMock: await hasDemoRows(period) };
}
