import { Card, Gauge, ResultRow, RiskBadge, WordCloud } from '../../components';
import { KitRow, KitSection } from '../KitSection.jsx';
import { sampleResults } from '../../services/mock/mockData.js';

const SAMPLE_TERMS = [
  { term: 'shocking', weight: 0.95, kind: 'hyperbole' },
  { term: 'secret', weight: 0.88, kind: 'clickbait' },
  { term: 'outrage', weight: 0.82, kind: 'emotional' },
  { term: 'destroyed', weight: 0.76, kind: 'hyperbole' },
  { term: 'finally', weight: 0.7, kind: 'clickbait' },
  { term: 'terrifying', weight: 0.66, kind: 'emotional' },
  { term: 'exposed', weight: 0.6, kind: 'clickbait' },
  { term: 'massive', weight: 0.55, kind: 'hyperbole' },
  { term: 'furious', weight: 0.5, kind: 'emotional' },
  { term: 'revealed', weight: 0.44, kind: 'clickbait' },
  { term: 'warning', weight: 0.4, kind: 'emotional' },
  { term: 'insane', weight: 0.36, kind: 'hyperbole' },
  { term: 'hidden', weight: 0.3, kind: 'clickbait' },
  { term: 'panic', weight: 0.26, kind: 'emotional' },
  { term: 'bombshell', weight: 0.2, kind: 'hyperbole' },
];

export function DataKit() {
  const rows = sampleResults(4);

  return (
    <>
      <KitSection id="gauge" title="Gauge" note="270° arc, counts up from 0 on mount. Colour follows risk level; aria-label carries the risk word.">
        <KitRow label="Sizes">
          <Gauge value={18} label="Sensationalism" size="sm" />
          <Gauge value={52} label="Headline mismatch" />
          <Gauge value={84} label="Bait-and-switch" size="lg" />
        </KitRow>
      </KitSection>

      <KitSection id="risk-badge" title="RiskBadge" note="Tint + ink colours; always says the words.">
        <KitRow label="md">
          <RiskBadge level="low" />
          <RiskBadge level="medium" />
          <RiskBadge level="high" />
        </KitRow>
        <KitRow label="sm">
          <RiskBadge level="low" size="sm" />
          <RiskBadge level="medium" size="sm" />
          <RiskBadge level="high" size="sm" />
        </KitRow>
      </KitSection>

      <KitSection id="word-cloud" title="WordCloud" note="Heaviest terms sit in the middle; hover shows the weight.">
        <Card>
          <WordCloud terms={SAMPLE_TERMS} />
        </Card>
      </KitSection>

      <KitSection id="result-row" title="ResultRow" note="Stack inside a padding-less Card; separators are automatic.">
        <Card padding="none">
          {rows.map((result) => (
            <ResultRow key={result.id} result={result} />
          ))}
        </Card>
      </KitSection>
    </>
  );
}
