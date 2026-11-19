// View state machine: idle → loading → result | unsupported | failure | error → loading (retry).

const TRANSITIONS = {
  idle: ['loading'],
  loading: ['result', 'unsupported', 'failure', 'error'],
  result: ['loading'],
  unsupported: ['loading'],
  failure: ['loading'],
  error: ['loading'],
};

// Reasons that mean "this kind of page isn't supported" rather than "extraction broke".
const UNSUPPORTED_REASONS = new Set(['unsupported_page', 'not_article']);

export function createViewState() {
  let state = { view: 'idle', status: '', extraction: null, result: null, error: null };
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(state));

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    go(view, patch = {}) {
      const allowed = TRANSITIONS[state.view] || [];
      if (!allowed.includes(view)) throw new Error(`Invalid transition ${state.view} → ${view}`);
      state = { ...state, ...patch, view };
      emit();
    },
    // Same-view updates, e.g. the loading status line.
    patch(patch) {
      state = { ...state, ...patch };
      emit();
    },
  };
}

export function viewForFailure(extraction) {
  return extraction && UNSUPPORTED_REASONS.has(extraction.reason) ? 'unsupported' : 'failure';
}
