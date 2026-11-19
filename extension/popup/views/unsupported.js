// Friendly empty state for pages Veritas doesn't analyse.
import { emptyState } from '../components/emptyState.js';
import { button } from '../components/button.js';

const GENERIC_MESSAGE = 'Veritas works on news and blog articles and on YouTube watch pages. Open one of those and try again.';
const BROWSER_PAGE_MESSAGE = "Chrome doesn't let extensions read its own pages (like this one). Switch to the tab with an article or a YouTube video, then click Veritas again.";

export function renderUnsupported(state, { retry }) {
  const extraction = state.extraction || {};
  return emptyState({
    iconName: 'globe',
    tone: 'neutral',
    title: 'Nothing to check here',
    message: extraction.reason === 'unsupported_page' ? BROWSER_PAGE_MESSAGE : GENERIC_MESSAGE,
    // The generic unsupported_page message just repeats the line above; other reasons add detail.
    detail: extraction.reason === 'unsupported_page' ? null : extraction.message,
    action: button('Check again', { variant: 'secondary', iconName: 'refresh', onClick: retry }),
  });
}
