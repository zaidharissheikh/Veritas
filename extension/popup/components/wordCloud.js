// XAI word cloud: weighted flow layout, heaviest terms gravitate to the middle,
// tinted by kind (hyperbole / emotional / clickbait) with a text legend.
import { h } from '../lib/dom.js';

const KINDS = [
  { kind: 'hyperbole', label: 'Hyperbole' },
  { kind: 'emotional', label: 'Emotional' },
  { kind: 'clickbait', label: 'Clickbait' },
];

export function wordCloud(terms, { max = 40, legend = true } = {}) {
  const items = arrangeCentred(dedupe(terms).slice(0, max));
  const cloud = h('div', { className: 'cloud' });

  if (items.length === 0) {
    cloud.appendChild(h('p', { className: 'cloud__empty' }, 'No charged terms stood out in the opening text.'));
    return cloud;
  }

  cloud.appendChild(
    h(
      'ul',
      { className: 'cloud__terms', 'aria-label': 'Terms that influenced the score' },
      ...items.map(termItem),
    ),
  );
  if (legend) cloud.appendChild(legendRow());
  return cloud;
}

function termItem({ term, weight, kind }) {
  const pct = Math.round(weight * 100);
  return h(
    'li',
    {
      className: 'cloud__term',
      'data-kind': kind,
      style: { '--w': weight.toFixed(2) },
      title: `${kindLabel(kind)} · ${pct}% weight`,
      'aria-label': `${term}, ${kindLabel(kind)}, ${pct} percent weight`,
    },
    term,
  );
}

function legendRow() {
  return h(
    'ul',
    { className: 'cloud__legend', 'aria-label': 'Legend' },
    ...KINDS.map(({ kind, label }) =>
      h('li', { className: 'cloud__legend-item', 'data-kind': kind }, h('span', { className: 'cloud__swatch', 'aria-hidden': 'true' }), label),
    ),
  );
}

function kindLabel(kind) {
  return (KINDS.find((entry) => entry.kind === kind) || KINDS[0]).label;
}

// Merge repeated terms, keeping the highest weight.
function dedupe(terms) {
  const byTerm = new Map();
  for (const entry of terms || []) {
    const key = String(entry.term || '').toLowerCase();
    if (!key) continue;
    const weight = Math.max(0, Math.min(1, Number(entry.weight) || 0));
    const existing = byTerm.get(key);
    if (!existing || existing.weight < weight) byTerm.set(key, { term: entry.term, weight, kind: entry.kind || 'hyperbole' });
  }
  return [...byTerm.values()].sort((a, b) => b.weight - a.weight);
}

// Alternate heavy terms to either end so the biggest words end up in the middle.
function arrangeCentred(sorted) {
  const out = [];
  sorted.forEach((item, i) => (i % 2 === 0 ? out.push(item) : out.unshift(item)));
  return out;
}
