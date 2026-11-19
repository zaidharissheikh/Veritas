// Risk score helpers — mirrors dashboard/src/lib/score.js (CONTRACTS §4).

const RISK_LABELS = { low: 'Low risk', medium: 'Moderate risk', high: 'High risk' };
const RISK_WORDS = { low: 'Low', medium: 'Moderate', high: 'High' };

export function clampScore(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function riskLevelFor(score) {
  const value = clampScore(score);
  if (value >= 67) return 'high';
  if (value >= 34) return 'medium';
  return 'low';
}

export function riskLabel(level) {
  return RISK_LABELS[level] || RISK_LABELS.low;
}

export function riskWord(level) {
  return RISK_WORDS[level] || RISK_WORDS.low;
}

export function formatScore(n) {
  return String(Math.round(clampScore(n)));
}
