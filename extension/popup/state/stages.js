// Honest loading progress: named steps that advance on timers sized to what the backend
// really does (BACKEND_CONTRACT §3). Never a percentage — we don't know one.

export const READING_STEP = 'Reading the page';
export const SLOW_NOTE = 'Still working — a first check of a page can take up to a minute.';

const SLOW_AFTER_MS = 25000;

const ANALYSIS_STEPS = {
  article: [
    { label: 'Checking the headline against the text', at: 0 },
    { label: 'Scoring the signals', at: 6000 },
  ],
  video: [
    { label: 'Fetching captions', at: 0 },
    { label: 'Checking the title against the transcript', at: 8000 },
    { label: 'Scoring the signals', at: 16000 },
  ],
};

// All step labels for the list in the loading view; just the reading step until the
// page type is known.
export function stepsFor(pageType) {
  const steps = ANALYSIS_STEPS[pageType];
  return steps ? [READING_STEP, ...steps.map((step) => step.label)] : [READING_STEP];
}

// Reports the first step now and the later ones as their time arrives; onSlow fires when
// the analysis drags on. Returns stop() to cancel whatever is still pending.
export function runAnalysisSteps(pageType, { onStep, onSlow }) {
  const [first, ...rest] = ANALYSIS_STEPS[pageType] || ANALYSIS_STEPS.article;
  onStep(first.label);
  const timers = rest.map((step) => setTimeout(() => onStep(step.label), step.at));
  timers.push(setTimeout(onSlow, SLOW_AFTER_MS));
  return () => timers.forEach(clearTimeout);
}
