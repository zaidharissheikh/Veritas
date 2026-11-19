// The popup pipeline (CONTRACTS §7): extract → analyze → view. Retry re-runs everything.
// While the backend works, named steps advance on timers so the wait reads honestly.
import { viewForFailure } from './viewState.js';
import { READING_STEP, SLOW_NOTE, runAnalysisSteps, stepsFor } from './stages.js';

const FALLBACK_FAILURE = {
  ok: false,
  reason: 'extraction_error',
  pageType: 'unknown',
  message: 'Something went wrong while reading this page.',
};

export function createFlow(viewState, { extract, analyze }) {
  let runId = 0;
  let stopSteps = () => {};

  async function run() {
    runId += 1;
    const id = runId;
    const isCurrent = () => id === runId;
    stopSteps();

    viewState.go('loading', {
      status: READING_STEP, steps: stepsFor(null), note: null, extraction: null, result: null, error: null,
    });

    const extraction = await safeExtract(extract);
    if (!isCurrent()) return;
    if (!extraction.ok) {
      viewState.go(viewForFailure(extraction), { extraction });
      return;
    }

    viewState.patch({ extraction, steps: stepsFor(extraction.pageType) });
    stopSteps = runAnalysisSteps(extraction.pageType, {
      onStep: (status) => isCurrent() && viewState.patch({ status }),
      onSlow: () => isCurrent() && viewState.patch({ note: SLOW_NOTE }),
    });

    try {
      const result = await analyze(extraction);
      if (isCurrent()) viewState.go('result', { extraction, result });
    } catch (error) {
      if (isCurrent()) viewState.go(viewFor(error), { extraction, error });
    } finally {
      // A newer run has already stopped these timers and owns `stopSteps` now.
      if (isCurrent()) stopSteps();
    }
  }

  return { run };
}

// analysis.service marks content problems (no captions, too short) as `failure`, which
// the failure view shows with the backend's message; anything else is a service error.
function viewFor(error) {
  return error && error.view === 'failure' ? 'failure' : 'error';
}

async function safeExtract(extract) {
  try {
    const extraction = await extract();
    return extraction && typeof extraction === 'object' ? extraction : FALLBACK_FAILURE;
  } catch {
    return FALLBACK_FAILURE;
  }
}
