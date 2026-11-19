// popup/state/flow.js + stages.js: which view each outcome lands in, and the loading steps.
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createViewState } from '../popup/state/viewState.js';
import { createFlow } from '../popup/state/flow.js';
import { READING_STEP, SLOW_NOTE, stepsFor } from '../popup/state/stages.js';
import { previewSample } from '../popup/services/extract.samples.js';

function record(viewState) {
  const states = [];
  viewState.subscribe((state) => states.push(state));
  return states;
}

function failing(code, view) {
  return async () => {
    const error = new Error(`${code} message`);
    error.code = code;
    error.view = view;
    throw error;
  };
}

afterEach(() => mock.timers.reset());

test('happy path: loading → result, with the extraction and the result in state', async () => {
  const viewState = createViewState();
  const states = record(viewState);
  const result = { id: 'res_1', saved: true };
  await createFlow(viewState, { extract: async () => previewSample('article'), analyze: async () => result }).run();
  assert.equal(states[0].view, 'loading');
  assert.equal(states[0].status, READING_STEP);
  assert.equal(states.at(-1).view, 'result');
  assert.equal(states.at(-1).result, result);
  assert.equal(states.at(-1).extraction.pageType, 'article');
});

test('a backend content problem (view: failure) shows the failure view with the error', async () => {
  const viewState = createViewState();
  const states = record(viewState);
  await createFlow(viewState, { extract: async () => previewSample('video'), analyze: failing('NO_CAPTIONS', 'failure') }).run();
  assert.equal(states.at(-1).view, 'failure');
  assert.equal(states.at(-1).error.message, 'NO_CAPTIONS message');
  assert.equal(states.at(-1).extraction.pageType, 'video');
});

test('a service problem (view: error) and a plain Error both show the error view', async () => {
  for (const analyze of [failing('NETWORK_ERROR', 'error'), async () => { throw new Error('boom'); }]) {
    const viewState = createViewState();
    const states = record(viewState);
    await createFlow(viewState, { extract: async () => previewSample('article'), analyze }).run();
    assert.equal(states.at(-1).view, 'error');
  }
});

test('extraction failures never call analyze', async () => {
  const viewState = createViewState();
  const states = record(viewState);
  let analyzed = 0;
  await createFlow(viewState, { extract: async () => previewSample('short'), analyze: async () => { analyzed += 1; } }).run();
  assert.equal(states.at(-1).view, 'failure');
  assert.equal(analyzed, 0);
});

test('loading steps advance on timers and a slow note appears, then timers stop', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const viewState = createViewState();
  const states = record(viewState);
  let finish;
  const analyze = () => new Promise((resolve) => { finish = resolve; });
  const run = createFlow(viewState, { extract: async () => previewSample('video'), analyze }).run();
  await new Promise((resolve) => setImmediate(resolve));

  const statuses = () => states.map((s) => s.status);
  assert.deepEqual(states.at(-1).steps, stepsFor('video'));
  assert.equal(states.at(-1).status, 'Fetching captions');
  mock.timers.tick(8000);
  assert.equal(states.at(-1).status, 'Checking the title against the transcript');
  mock.timers.tick(8000);
  assert.equal(states.at(-1).status, 'Scoring the signals');
  mock.timers.tick(9000);
  assert.equal(states.at(-1).note, SLOW_NOTE);
  assert.ok(statuses().includes(READING_STEP));

  finish({ id: 'res_2' });
  await run;
  const count = states.length;
  mock.timers.tick(60000);
  assert.equal(states.length, count, 'no updates after the result arrived');
  assert.equal(states.at(-1).view, 'result');
});

test('stepsFor lists only the reading step until the page type is known', () => {
  assert.deepEqual(stepsFor(null), [READING_STEP]);
  assert.equal(stepsFor('article').length, 3);
  assert.equal(stepsFor('video').length, 4);
});
