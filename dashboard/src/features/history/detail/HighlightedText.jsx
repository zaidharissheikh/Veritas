import { Fragment, useMemo } from 'react';
import { kindClass, kindInfo, weightAlpha, weightPercent } from './highlights';
import './HighlightedText.css';

// tokenIndex is defined as an index into excerpt.split(/\s+/) (CONTRACTS §5),
// so we split exactly that way and never re-tokenise.
function splitTokens(excerpt) {
  return String(excerpt || '').split(/\s+/);
}

function indexByToken(highlights) {
  const map = new Map();
  for (const h of highlights || []) {
    if (h && Number.isInteger(h.tokenIndex)) map.set(h.tokenIndex, h);
  }
  return map;
}

function HighlightToken({ token, highlight }) {
  const { label } = kindInfo(highlight.kind);
  const pct = weightPercent(highlight.weight);
  const style = { '--hl-alpha': weightAlpha(highlight.weight) };
  return (
    <mark
      className={`hl-token ${kindClass(highlight.kind)}`}
      style={style}
      title={`${label} · ${pct}% weight`}
    >
      {token}
      <span className="sr-only"> ({label}, {pct}% weight)</span>
    </mark>
  );
}

export function HighlightedText({ excerpt, highlights }) {
  const tokens = useMemo(() => splitTokens(excerpt), [excerpt]);
  const byIndex = useMemo(() => indexByToken(highlights), [highlights]);

  if (!excerpt) {
    return <p className="hl-text hl-text--empty">No excerpt was stored for this analysis.</p>;
  }

  return (
    <p className="hl-text">
      {tokens.map((token, i) => {
        if (!token) return null;
        const highlight = byIndex.get(i);
        return (
          <Fragment key={i}>
            {i > 0 && ' '}
            {highlight ? <HighlightToken token={token} highlight={highlight} /> : token}
          </Fragment>
        );
      })}
    </p>
  );
}
