// The three kinds of manipulative wording the explainer flags (CONTRACTS §5 Highlight.kind).
// Single source for labels and descriptions used by the word cloud, legends and lists.

export const TERM_KINDS = [
  { kind: 'hyperbole', label: 'Hyperbole', description: 'Exaggerated or absolute wording that inflates a claim.' },
  { kind: 'emotional', label: 'Emotional', description: 'Words chosen to provoke fear, anger or excitement.' },
  { kind: 'clickbait', label: 'Clickbait', description: 'Teasers and curiosity gaps that push you to click.' },
];

const BY_KIND = Object.fromEntries(TERM_KINDS.map((k) => [k.kind, k]));

export function isKnownKind(kind) {
  return Boolean(BY_KIND[kind]);
}

/** { kind, label, description } for a kind; a neutral fallback for anything unknown. */
export function kindInfo(kind) {
  return BY_KIND[kind] ?? { kind, label: 'Signal', description: '' };
}

export function kindLabel(kind) {
  return kindInfo(kind).label;
}
