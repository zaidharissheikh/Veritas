import { useMemo } from 'react';
import { Card, WordCloud } from '../../../components';
import { HighlightedText } from './HighlightedText';
import { HighlightLegend } from './HighlightLegend';
import { TermsList } from './TermsList';
import { rankTerms } from './highlights';
import './WhyCard.css';

// "Why this score" — the XAI section (FR-4.1..4.3): the excerpt with weighted
// marks, a legend for the three kinds, then the cloud and the ranked list.
export function WhyCard({ excerpt, highlights }) {
  const terms = useMemo(() => rankTerms(highlights), [highlights]);

  return (
    <Card className="why-card" padding="lg" aria-labelledby="why-card-title">
      <header className="why-card__header">
        <h2 id="why-card-title" className="why-card__title">Why this score</h2>
        <p className="why-card__lead">
          Words that raised the manipulation likelihood, shaded by how much each one counted.
        </p>
      </header>

      <HighlightedText excerpt={excerpt} highlights={highlights} />
      <HighlightLegend />

      {terms.length > 0 ? (
        <div className="why-card__terms">
          <WordCloud terms={terms} legend={false} />
          <TermsList terms={terms} />
        </div>
      ) : (
        <p className="why-card__empty">No manipulative terms stood out in this text.</p>
      )}
    </Card>
  );
}
