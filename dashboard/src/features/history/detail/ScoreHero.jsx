import { Card, Gauge, RiskBadge } from '../../../components';
import { formatScore } from '../../../lib/score';
import './ScoreHero.css';

// Overall risk score + the two per-type gauges from result.gauges (CONTRACTS §5).
export function ScoreHero({ result }) {
  const gauges = Array.isArray(result.gauges) ? result.gauges : [];

  return (
    <Card className="score-hero" padding="lg" aria-labelledby="score-hero-title">
      <h2 id="score-hero-title" className="sr-only">Scores</h2>

      <div className="score-hero__overall">
        <span className="score-hero__caption">Manipulation likelihood</span>
        <span className="score-hero__value" aria-label={`${formatScore(result.riskScore)} out of 100`}>
          {formatScore(result.riskScore)}
          <span className="score-hero__max" aria-hidden="true">/100</span>
        </span>
        <RiskBadge level={result.riskLevel} />
      </div>

      <div className="score-hero__gauges">
        {gauges.map((gauge) => (
          <Gauge key={gauge.key} value={gauge.value} label={gauge.label} size="lg" />
        ))}
      </div>
    </Card>
  );
}
