// Pure helpers for the XAI highlight data (CONTRACTS §5 Highlight).
// Kind colours live in highlights.css so every highlight surface shares them.
import { isKnownKind } from '../../../lib/termKinds';
import './highlights.css';

export { TERM_KINDS, kindInfo } from '../../../lib/termKinds';

export function kindClass(kind) {
  return isKnownKind(kind) ? `hl-kind--${kind}` : 'hl-kind--other';
}

export function weightPercent(weight) {
  const n = Number(weight);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(1, Math.max(0, n)) * 100);
}

// Background alpha for a highlighted token: 18% at weight 0 → 60% at weight 1,
// so even weak signals stay visible without heavy tokens turning into blocks.
export function weightAlpha(weight) {
  return `${18 + Math.round(weightPercent(weight) * 0.42)}%`;
}

// Highlight tokens keep their punctuation ("Finally:"); the term lists show the bare word.
function bareWord(token) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

// Collapse repeated tokens (case-insensitive) into one term carrying the
// strongest weight, then rank strongest first. Feeds the cloud and the list.
export function rankTerms(highlights = [], limit = 10) {
  const byTerm = new Map();
  for (const h of highlights) {
    const term = h?.token ? bareWord(h.token) : '';
    if (!term) continue;
    const key = term.toLowerCase();
    const prev = byTerm.get(key);
    if (!prev || h.weight > prev.weight) {
      byTerm.set(key, { term, weight: h.weight, kind: h.kind, count: (prev?.count || 0) + 1 });
    } else {
      prev.count += 1;
    }
  }
  return [...byTerm.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
