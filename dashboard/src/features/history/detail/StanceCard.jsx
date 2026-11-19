import { Card, Meter } from '../../../components';
import { weightPercent } from './highlights';
import './StanceCard.css';

// Plain-language meaning of each stance label (ERD ARTICLE_RESULT.stance).
const STANCE_MEANING = {
  Agrees: 'The article body backs up what its headline claims.',
  Disagrees: 'The article body contradicts its headline, a sign of headline mismatch.',
  Discusses: 'The article body talks about the headline topic without clearly backing it.',
  Unrelated: 'The article body does not address what its headline promises.',
};

export function StanceCard({ article }) {
  if (!article) return null;
  const label = article.stanceLabel || 'Discusses';
  const meaning = STANCE_MEANING[label] || STANCE_MEANING.Discusses;
  const confidence = weightPercent(article.stanceConfidence);

  return (
    <Card className="stance" aria-labelledby="stance-title">
      <h2 id="stance-title" className="stance__title">Headline vs body</h2>
      <p className="stance__label">{label}</p>
      <p className="stance__meaning">{meaning}</p>

      <div className="stance__confidence">
        <div className="stance__confidence-head">
          <span>Confidence</span>
          <span className="stance__confidence-pct">{confidence}%</span>
        </div>
        <Meter value={confidence} label="Stance confidence" />
      </div>
    </Card>
  );
}
