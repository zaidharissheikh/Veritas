// Risk scoring helpers. Scores measure likelihood of manipulation, never truth.

// Score at which each level starts (low < 34, medium 34–66, high ≥ 67). CONTRACTS §4.
export const RISK_THRESHOLDS = { medium: 34, high: 67 };

const LABELS = {
  low: 'Low risk',
  medium: 'Moderate risk',
  high: 'High risk',
};

export function clampScore(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

export function riskLevelFor(score) {
  const s = clampScore(score);
  if (s >= RISK_THRESHOLDS.high) return 'high';
  if (s >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function riskLabel(level) {
  return LABELS[level] ?? LABELS.low;
}

export function riskVar(level) {
  const safe = LABELS[level] ? level : 'low';
  return `var(--risk-${safe})`;
}

export function formatScore(n) {
  return String(Math.round(clampScore(n)));
}
