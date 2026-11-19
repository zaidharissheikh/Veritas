import { useState } from 'react';
import { DemoChip, PageHeader, Segmented } from '../../components';
import { useAsync } from '../../hooks/useAsync';
import { getDiet } from '../../services/historyApi';
import { PERIOD_OPTIONS } from '../../lib/dates';
import { DEFAULT_PERIOD } from './dietText';
import DietHero from './DietHero.jsx';
import TrendChart from './TrendChart.jsx';
import RiskMix from './RiskMix.jsx';
import ContentMix from './ContentMix.jsx';
import TopTerms from './TopTerms.jsx';
import DietSkeleton from './DietSkeleton.jsx';
import { DietEmpty, DietError } from './DietStates.jsx';
import './DietPage.css';

export default function DietPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const { data, error, loading, reload } = useAsync(() => getDiet({ period }), [period]);
  // Same rule as Overview/History: the chip marks demo scores, never real ones.
  const showsDemoData = Boolean(data?.totalAnalyses && data.isMock);

  return (
    <div className="diet">
      <PageHeader
        title="Information Diet"
        subtitle="How much manipulation is in what you read and watch."
        actions={
          <div className="diet-actions">
            {showsDemoData && <DemoChip />}
            <Segmented
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
              ariaLabel="Time period"
            />
          </div>
        }
      />
      <DietBody
        data={data}
        error={error}
        loading={loading}
        period={period}
        onRetry={reload}
        onShowAll={() => setPeriod('all')}
      />
    </div>
  );
}

function DietBody({ data, error, loading, period, onRetry, onShowAll }) {
  if (loading && !data) return <DietSkeleton />;
  if (error) return <DietError error={error} onRetry={onRetry} />;
  if (!data || data.totalAnalyses === 0) {
    return <DietEmpty period={period} onShowAll={onShowAll} />;
  }

  // On a period change we keep the previous charts visible, dimmed, instead of
  // flashing a skeleton — no layout jump.
  return (
    <div className={`diet-grid${loading ? ' is-refreshing' : ''}`} aria-busy={loading}>
      <DietHero
        averageScore={data.averageScore}
        previousAverageScore={data.previousAverageScore}
        totalAnalyses={data.totalAnalyses}
        period={period}
      />
      <TrendChart points={data.points} period={period} />
      <RiskMix riskMix={data.riskMix} />
      <ContentMix byType={data.byType} />
      <TopTerms topTerms={data.topTerms} />
    </div>
  );
}
