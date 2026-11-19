// Analysis service unavailable — the page was read, the scoring step failed.
import { emptyState } from '../components/emptyState.js';
import { button } from '../components/button.js';

const FALLBACK_MESSAGE = 'The analysis service is not responding right now.';

const DETAILS = {
  NETWORK_ERROR: 'The page was read fine. Start the Veritas backend on port 8000, then retry.',
  TIMEOUT: 'The page was read fine; the server did not answer in time. Retrying usually works.',
};
const DEFAULT_DETAIL = 'The page was read; only the scoring step failed.';

export function renderError(state, { retry }) {
  const error = state.error || {};
  return emptyState({
    iconName: 'cloud-off',
    tone: 'warn',
    title: 'Analysis unavailable',
    message: error.message || FALLBACK_MESSAGE,
    detail: DETAILS[error.code] || DEFAULT_DETAIL,
    action: button('Retry', { variant: 'primary', iconName: 'refresh', onClick: retry }),
  });
}
