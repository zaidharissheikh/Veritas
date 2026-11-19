import { Card } from '../../../components';
import './SummaryCard.css';

export function SummaryCard({ summary }) {
  return (
    <Card className="summary-card" aria-labelledby="summary-card-title">
      <h2 id="summary-card-title" className="summary-card__title">Summary</h2>
      <p className="summary-card__text">
        {summary || 'No summary was stored for this analysis.'}
      </p>
    </Card>
  );
}
