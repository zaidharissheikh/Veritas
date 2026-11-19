import { Card, WordCloud } from '../../components';
import { kindLabel } from '../../lib/termKinds';
import './TopTerms.css';

const TOP_N = 5;
const CLOUD_MAX = 20;

function rankTerms(terms) {
  return [...terms]
    .sort((a, b) => b.count - a.count || b.weight - a.weight)
    .slice(0, TOP_N);
}

export default function TopTerms({ topTerms = [] }) {
  const ranked = rankTerms(topTerms);

  return (
    <Card className="diet-terms" padding="lg">
      <header className="diet-card__head">
        <h2 className="diet-card__title">Top manipulative terms</h2>
        <p className="diet-card__caption">
          Words the explainer flagged most often across your analyses. Larger means a stronger signal.
        </p>
      </header>

      {ranked.length === 0 ? (
        <p className="diet-card__quiet">No flagged terms in this period.</p>
      ) : (
        <div className="diet-terms__body">
          <div className="diet-terms__cloud">
            <WordCloud terms={topTerms} max={CLOUD_MAX} />
          </div>
          <ol className="diet-terms__list" aria-label="Top five terms by number of mentions">
            {ranked.map((t, i) => (
              <li key={t.term} className="diet-terms__row">
                <span className="diet-terms__rank tabular" aria-hidden="true">{i + 1}</span>
                <span className="diet-terms__term">{t.term}</span>
                <span className="diet-terms__kind">{kindLabel(t.kind)}</span>
                <span className="diet-terms__count tabular">
                  {t.count}
                  <span className="sr-only"> mentions</span>
                  <span aria-hidden="true">×</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
