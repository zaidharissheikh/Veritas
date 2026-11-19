import { Button, DemoChip, EmptyState, Gauge, PageHeader, RiskBadge } from '../../components';
import { useAsync } from '../../hooks/useAsync.js';
import { errorMessage } from '../../lib/errors.js';
import { riskLevelFor } from '../../lib/score.js';
import { countLabel } from '../../lib/text.js';
import * as historyApi from '../../services/historyApi.js';
import { useAuth } from '../auth/useAuth.js';
import { DeltaLine } from './DeltaLine.jsx';
import { greetingFor, nameFromEmail, periodSummary } from './greeting.js';
import { OverviewEmpty } from './OverviewEmpty.jsx';
import { OverviewSkeleton } from './OverviewSkeleton.jsx';
import * as stats from './overviewStats.js';
import { RecentList } from './RecentList.jsx';
import { StatNumber, StatTile } from './StatTile.jsx';
import { TrendCard } from './TrendCard.jsx';
import './OverviewPage.css';

async function loadOverview() {
  const [diet, history] = await Promise.all([
    historyApi.getDiet({ period: '30d' }),
    historyApi.listHistory({ type: 'all', period: 'all' }),
  ]);
  return { diet, history };
}

/** Staggered fade-up: each block gets an index the CSS turns into a delay. */
function enter(index) {
  return { className: 'ov-enter', style: { '--stagger': index } };
}

function AverageRiskTile({ diet, delta }) {
  const hasAverage = diet.totalAnalyses > 0 && diet.averageScore != null;
  return (
    <StatTile
      {...enter(0)}
      label="Average risk"
      icon="shield-check"
      detail={hasAverage ? <DeltaLine delta={delta} /> : 'No analyses in the last 30 days'}
    >
      {hasAverage ? (
        <>
          <Gauge value={diet.averageScore} label="30-day average" size="sm" />
          <RiskBadge level={riskLevelFor(diet.averageScore)} size="sm" />
        </>
      ) : (
        <StatNumber value="—" />
      )}
    </StatTile>
  );
}

function OverviewBody({ diet, history }) {
  const now = new Date();
  const week = stats.thisWeek(history, now);
  const month = stats.thisMonth(history, now);
  const byType = stats.countByType(week);
  const delta = stats.describeDelta(stats.scoreDelta(diet));

  return (
    <div className="overview">
      <div className="overview__tiles">
        <AverageRiskTile diet={diet} delta={delta} />
        <StatTile
          {...enter(1)}
          label="Analyses this week"
          icon="clock"
          detail={`${countLabel(byType.article, 'article')} · ${countLabel(byType.video, 'video')}`}
        >
          <StatNumber value={week.length} />
        </StatTile>
        <StatTile
          {...enter(2)}
          label={`High risk in ${stats.monthName(now)}`}
          icon="alert"
          detail={`of ${countLabel(month.length, 'analysis', 'analyses')} this month`}
        >
          <StatNumber value={stats.highRiskOnly(month).length} />
        </StatTile>
      </div>

      <TrendCard {...enter(3)} points={diet.points} averageScore={diet.averageScore} delta={delta} />
      <RecentList {...enter(4)} results={stats.newest(history)} />
    </div>
  );
}

function OverviewError({ error, onRetry }) {
  return (
    <div className="ov-error" {...enter(0)}>
      <EmptyState
        icon="alert"
        title="Couldn't load your overview"
        message={errorMessage(error, 'Something went wrong while fetching your analyses. Please try again.')}
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </div>
  );
}

function subtitleFor({ loading, data }) {
  if (loading) return 'Looking at your last 30 days…';
  if (data) return periodSummary(data.diet);
  return 'Your last 30 days at a glance';
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(loadOverview, []);
  const showDemoChip = Boolean(data && stats.isMockData(data.history));

  return (
    <>
      <PageHeader
        title={`${greetingFor()}, ${nameFromEmail(user?.email)}`}
        subtitle={subtitleFor({ loading, data })}
        actions={showDemoChip ? <DemoChip /> : null}
      />
      {loading && <OverviewSkeleton />}
      {!loading && error && <OverviewError error={error} onRetry={reload} />}
      {!loading && data && (data.history.length ? <OverviewBody {...data} /> : <OverviewEmpty {...enter(0)} />)}
    </>
  );
}
