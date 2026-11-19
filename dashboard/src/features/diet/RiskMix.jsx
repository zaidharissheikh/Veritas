import { Card } from '../../components';
import { riskLabel } from '../../lib/score';
import { countLabel } from '../../lib/text';
import { percentOf } from './dietText';
import './RiskMix.css';

const LEVELS = ['low', 'medium', 'high'];

export default function RiskMix({ riskMix }) {
  const total = LEVELS.reduce((sum, level) => sum + (riskMix[level] || 0), 0);
  const rows = LEVELS.map((level) => ({
    level,
    label: riskLabel(level),
    count: riskMix[level] || 0,
    pct: percentOf(riskMix[level], total),
  }));
  const summary = rows.map((r) => `${r.label} ${r.pct}%`).join(', ');

  return (
    <Card className="diet-mix" padding="lg">
      <header className="diet-card__head">
        <h2 className="diet-card__title">Risk mix</h2>
        <p className="diet-card__caption">Share of analyses at each risk level.</p>
      </header>

      <div className="diet-mix__bar" role="img" aria-label={summary}>
        {rows
          .filter((r) => r.count > 0)
          .map((r) => (
            <span key={r.level} className={`diet-mix__seg is-${r.level}`} style={{ flexGrow: r.count }} />
          ))}
      </div>

      <ul className="diet-mix__legend">
        {rows.map((r) => (
          <li key={r.level} className="diet-mix__row">
            <span className={`diet-mix__dot is-${r.level}`} aria-hidden="true" />
            <span className="diet-mix__label">{r.label}</span>
            <span className="diet-mix__pct tabular">{r.pct}%</span>
            <span className="diet-mix__count tabular">{countLabel(r.count, 'analysis', 'analyses')}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
