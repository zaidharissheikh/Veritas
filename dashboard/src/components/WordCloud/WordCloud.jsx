import { useMemo } from 'react';
import { TERM_KINDS, isKnownKind } from '../../lib/termKinds.js';
import { centerWeighted, fontSizeFor, fontWeightFor, formatWeight, sortTerms } from './layout.js';
import './WordCloud.css';

function kindClass(kind) {
  return isKnownKind(kind) ? kind : 'emotional';
}

/**
 * Weighted flow layout of manipulative terms. Font size and weight follow
 * the 0..1 weight; tint follows the kind. Hover shows the exact weight.
 */
export function WordCloud({ terms = [], max = 40, legend = true, className = '' }) {
  const laidOut = useMemo(() => centerWeighted(sortTerms(terms, max)), [terms, max]);

  if (laidOut.length === 0) {
    return <p className="word-cloud__empty">No highlighted terms yet.</p>;
  }

  return (
    <div className={`word-cloud ${className}`.trim()}>
      <ul className="word-cloud__terms" aria-label="Highlighted terms by weight">
        {laidOut.map(({ term, weight, kind, count }) => (
          <li
            key={`${kind}-${term}`}
            className={`word-cloud__term word-cloud__term--${kindClass(kind)}`}
            style={{ fontSize: fontSizeFor(weight), fontWeight: fontWeightFor(weight) }}
            title={`${term} — weight ${formatWeight(weight)}${count ? `, seen ${count}×` : ''}`}
          >
            {term}
          </li>
        ))}
      </ul>
      {legend && (
        <ul className="word-cloud__legend" aria-label="Term kinds">
          {TERM_KINDS.map(({ kind, label }) => (
            <li key={kind} className={`word-cloud__key word-cloud__key--${kind}`}>
              <span className="word-cloud__swatch" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
