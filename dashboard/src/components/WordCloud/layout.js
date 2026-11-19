// Pure helpers for the word cloud. Deterministic: same input, same output.

const MIN_PX = 13;
const MAX_PX = 34;

function clamp01(n) {
  return Math.min(1, Math.max(0, Number(n) || 0));
}

/** Heaviest terms first, ties broken alphabetically so order never flickers. */
export function sortTerms(terms, max) {
  return [...terms]
    .filter((t) => t && t.term)
    .sort((a, b) => clamp01(b.weight) - clamp01(a.weight) || a.term.localeCompare(b.term))
    .slice(0, max);
}

/**
 * Interleaves a sorted list so the heaviest terms land in the middle of a
 * flow layout and lighter ones drift toward the edges.
 */
export function centerWeighted(sorted) {
  const out = [];
  sorted.forEach((item, i) => (i % 2 === 0 ? out.push(item) : out.unshift(item)));
  return out;
}

export function fontSizeFor(weight) {
  return Math.round(MIN_PX + clamp01(weight) * (MAX_PX - MIN_PX));
}

export function fontWeightFor(weight) {
  const w = clamp01(weight);
  if (w >= 0.7) return 700;
  if (w >= 0.4) return 600;
  return 500;
}

export function formatWeight(weight) {
  return `${Math.round(clamp01(weight) * 100)}%`;
}
