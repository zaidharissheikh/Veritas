import { Card, Gauge, Icon } from '../../components';
import { riskLabel, riskLevelFor } from '../../lib/score';
import { countLabel } from '../../lib/text';
import { deltaFor, deltaSentence, periodLabel, readingFor } from './dietText';
import './DietHero.css';

const DELTA_ICONS = { down: 'trending-down', up: 'trending-up' };

export default function DietHero({ averageScore, previousAverageScore, totalAnalyses, period }) {
  const level = riskLevelFor(averageScore);
  const delta = deltaFor(averageScore, previousAverageScore);

  return (
    <Card className="diet-hero" padding="lg">
      <h2 className="sr-only">Summary</h2>
      <div className="diet-hero__gauge">
        <Gauge value={averageScore} label="Average risk" size="lg" />
      </div>
      <div className="diet-hero__text">
        <p className="diet-hero__reading">{readingFor(averageScore)}</p>
        <p className="diet-hero__level">
          <span className={`diet-hero__dot is-${level}`} aria-hidden="true" />
          {riskLabel(level)} on average
        </p>
        <DeltaLine delta={delta} period={period} />
        <p className="diet-hero__total">
          <span className="tabular">{countLabel(totalAnalyses, 'analysis', 'analyses')}</span>
          {period === 'all' ? ' in total' : ` in the last ${periodLabel(period)}`}
        </p>
      </div>
    </Card>
  );
}

function DeltaLine({ delta, period }) {
  if (!delta) {
    return <p className="diet-hero__delta is-none">No earlier period to compare with yet.</p>;
  }
  const icon = DELTA_ICONS[delta.direction];
  return (
    <p className={`diet-hero__delta is-${delta.direction}`}>
      <span className="diet-hero__delta-icon" aria-hidden="true">
        {icon ? <Icon name={icon} size={16} /> : <SteadyGlyph />}
      </span>
      <span>
        <strong>{delta.word}</strong> · {deltaSentence(delta, period)}
      </span>
    </p>
  );
}

function SteadyGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8h10" strokeLinecap="round" />
    </svg>
  );
}
