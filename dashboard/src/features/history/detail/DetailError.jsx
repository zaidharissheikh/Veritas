import { Button, EmptyState } from '../../../components';
import { errorMessage } from '../../../lib/errors';
import './DetailError.css';

// UC-11 alternative flow 1: the entry cannot be found → "Entry unavailable".
function NotFound() {
  return (
    <EmptyState
      icon="alert"
      title="Entry unavailable"
      message="This analysis could not be found. It may have been removed, or the link is incorrect."
      action={<Button to="/history">Back to history</Button>}
    />
  );
}

function LoadFailed({ error, onRetry }) {
  return (
    <EmptyState
      icon="alert"
      title="Could not load this analysis"
      message={errorMessage(error, 'Something went wrong while fetching the result.')}
      action={
        <div className="detail-error__actions">
          <Button onClick={onRetry}>Try again</Button>
          <Button variant="secondary" to="/history">Back to history</Button>
        </div>
      }
    />
  );
}

export function DetailError({ error, onRetry }) {
  return (
    <div className="detail-error">
      {error?.code === 'NOT_FOUND' ? <NotFound /> : <LoadFailed error={error} onRetry={onRetry} />}
    </div>
  );
}
