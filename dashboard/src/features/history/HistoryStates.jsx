import { Button, EmptyState } from '../../components';
import { errorMessage } from '../../lib/errors';

// The three non-list states of the history page. Copy stays plain and calm.

export function HistoryError({ error, onRetry }) {
  return (
    <EmptyState
      icon="alert"
      title="Couldn't load your history"
      message={errorMessage(error, 'Something went wrong while fetching your analyses. Please try again.')}
      action={
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}

export function HistoryNoContent() {
  return (
    <EmptyState
      icon="clock"
      title="No analyzed content yet"
      message="Analyze an article or YouTube video with the Veritas extension and it will appear here."
    />
  );
}

export function HistoryNoMatches({ onClear }) {
  return (
    <EmptyState
      icon="search"
      title="No matches"
      message="Nothing in your history matches these filters."
      action={
        onClear ? (
          <Button variant="secondary" onClick={onClear}>
            Clear filters
          </Button>
        ) : null
      }
    />
  );
}
