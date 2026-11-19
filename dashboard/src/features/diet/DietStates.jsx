import { Button, EmptyState, SetupSteps } from '../../components';
import { useAsync } from '../../hooks/useAsync';
import { errorMessage } from '../../lib/errors';
import { getDiet } from '../../services/historyApi';
import { periodLabel } from './dietText';
import DietSkeleton from './DietSkeleton.jsx';

// Empty for the selected period. If the account has no history at all we show
// the UC-09 "no analyzed content" message; otherwise just a period hint.
export function DietEmpty({ period, onShowAll }) {
  const { data, loading } = useAsync(
    () => (period === 'all' ? Promise.resolve({ totalAnalyses: 0 }) : getDiet({ period: 'all' })),
    [period],
  );
  if (loading) return <DietSkeleton />;

  // A failed check falls through to the install guidance, which is still useful.
  const hasOlderHistory = Boolean(data && data.totalAnalyses > 0);
  if (hasOlderHistory) {
    return (
      <EmptyState
        icon="chart"
        title={`Nothing analyzed in the last ${periodLabel(period)}`}
        message="Pick a longer period, or analyze something new with the Veritas extension."
        action={
          <Button variant="secondary" onClick={onShowAll}>
            Show all time
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon="chart"
      title="No analyzed content exists yet"
      message="Your Information Diet builds up as you analyze articles and videos with the Veritas extension."
      action={<SetupSteps />}
    />
  );
}

export function DietError({ error, onRetry }) {
  return (
    <EmptyState
      icon="alert"
      title="Couldn't load your Information Diet"
      message={errorMessage(error, 'Something went wrong while aggregating your history.')}
      action={
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
