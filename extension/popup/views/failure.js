// UC-08: the page could not be read, or the backend could not check it (no captions,
// too little text, video not found) — say why and offer to try again.
import { emptyState } from '../components/emptyState.js';
import { button } from '../components/button.js';

const FALLBACK_MESSAGE = 'The page could not be read. Reload it and try again.';

export function renderFailure(state, { retry }) {
  const extraction = state.extraction || {};
  const isVideo = extraction.pageType === 'video';
  const backendError = state.error && state.error.message ? state.error : null;
  return emptyState({
    iconName: 'alert',
    tone: 'warn',
    title: titleFor(isVideo, Boolean(backendError)),
    message: backendError ? backendError.message : extraction.message || FALLBACK_MESSAGE,
    detail: backendError ? 'The page was read; the check itself was skipped.' : null,
    action: button('Try again', { variant: 'primary', iconName: 'refresh', onClick: retry }),
  });
}

function titleFor(isVideo, wasChecked) {
  const subject = isVideo ? 'video' : 'page';
  return wasChecked ? `Couldn’t check this ${subject}` : `Couldn’t read this ${subject}`;
}
