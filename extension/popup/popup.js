// Popup entry: wires the view state machine to the extract → analyze flow, the footer
// account row and the sign-in sheet.
import { replaceChildren } from './lib/dom.js';
import { createViewState } from './state/viewState.js';
import { createFlow } from './state/flow.js';
import { extractFromActiveTab } from './services/extract.js';
import { analyze as analyzeLive } from './services/analysis.service.js';
import { analyze as analyzeMock } from './services/analysis.mock.js';
import { getSession, login, logout } from './services/auth.js';
import { applyPreviewSetup, isDesignPreview, previewParam } from './services/preview.js';
import { setDemoChip, topbar } from './views/shell.js';
import { createFooter } from './views/footer.js';
import { renderLoading, updateLoading } from './views/loading.js';
import { renderResult } from './views/result.js';
import { renderUnsupported } from './views/unsupported.js';
import { renderFailure } from './views/failure.js';
import { renderError } from './views/error.js';

const RENDERERS = {
  loading: renderLoading,
  result: renderResult,
  unsupported: renderUnsupported,
  failure: renderFailure,
  error: renderError,
};

// The mock serves only the design preview (popup opened as a plain page); the extension
// always talks to the backend.
const analyze = isDesignPreview() ? analyzeMock : analyzeLive;

const viewState = createViewState();
const flow = createFlow(viewState, { extract: extractFromActiveTab, analyze });
const footer = createFooter({ getSession, login, logout, onSessionChange: handleSessionChange });
const actions = { retry: () => flow.run(), signIn: footer.openSheet };

const root = document.getElementById('app');
const header = topbar();
const main = document.createElement('main');
main.className = 'content';
main.id = 'view';
replaceChildren(root, header, main, footer.element);

let latest = null;
let renderedView = null;

viewState.subscribe((state) => {
  latest = state;
  const render = RENDERERS[state.view];
  if (!render) return;
  setDemoChip(header, Boolean(state.result && state.result.isMock));
  if (state.view === renderedView && state.view === 'loading') {
    updateLoading(main, state);
    return;
  }
  renderedView = state.view;
  replaceChildren(main, render(state, actions));
  root.scrollTop = 0;
});

// Signing in right after a result was shown: run again so this check lands in the history
// too (the backend caches the analysis, so it is quick).
function handleSessionChange(session) {
  if (session && latest && latest.view === 'result' && !latest.result.saved) flow.run();
}

async function start() {
  await applyPreviewSetup();
  await footer.refresh();
  flow.run();
  if (previewParam('sheet') === 'open') footer.openSheet();
}

start();
