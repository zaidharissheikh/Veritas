import { Card, EmptyState, SetupSteps } from '../../components';

/** Warm first-run state for an account with no analyses yet. */
export function OverviewEmpty(props) {
  return (
    <Card padding="none" {...props}>
      <EmptyState
        icon="sparkles"
        title="Your Information Diet starts here"
        message="Analyze your first article or video and your scores, trends and history will appear on this page."
        action={<SetupSteps />}
      />
    </Card>
  );
}
