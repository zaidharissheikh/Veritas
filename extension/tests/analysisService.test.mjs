// popup/services/analysis.service.js: request shapes, auth header, error mapping, timeout.
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, requestFor } from '../popup/services/analysis.service.js';
import { getSession, saveSession } from '../popup/services/auth.js';
import { previewSample } from '../popup/services/extract.samples.js';
import { ANALYZE_TIMEOUT_MS, API_BASE_URL } from '../popup/config.js';
import {
  authHeaderOf, bodyOf, fakeLocalStorage, hangingFetch, installFetch, jsonResponse, makeToken, networkFailure,
} from './helpers/backend.mjs';

const FUTURE = Math.floor(Date.now() / 1000) + 1800;
const RESULT = { id: 'res_0a1b2c3d', contentType: 'article', riskScore: 42, riskLevel: 'medium', isMock: false, saved: false };

const signIn = () => saveSession({ token: makeToken({ exp: FUTURE }), user: { email: 'demo@veritas.app' } });

beforeEach(() => {
  globalThis.localStorage = fakeLocalStorage();
});

afterEach(() => {
  delete globalThis.localStorage;
  delete globalThis.fetch;
  mock.timers.reset();
});

test('article: POST /analyze/article with url, headline and body; no auth header signed out', async () => {
  const calls = installFetch(() => jsonResponse(200, RESULT));
  const extraction = previewSample('article');
  const result = await analyze(extraction);
  assert.deepEqual(result, RESULT);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${API_BASE_URL}/analyze/article`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.equal(authHeaderOf(calls[0]), undefined);
  assert.deepEqual(bodyOf(calls[0]), {
    url: extraction.url, headline: extraction.article.headline, body: extraction.article.body,
  });
});

test('video: POST /analyze/video with the extracted metadata', async () => {
  const calls = installFetch(() => jsonResponse(200, { ...RESULT, contentType: 'video' }));
  const extraction = previewSample('video');
  await analyze(extraction);
  assert.equal(calls[0].url, `${API_BASE_URL}/analyze/video`);
  assert.deepEqual(bodyOf(calls[0]), {
    url: extraction.url,
    videoId: 'dQw4w9WgXcQ',
    title: extraction.video.title,
    thumbnailUrl: extraction.video.thumbnailUrl,
    channel: 'Rick Astley',
  });
});

test('optional video fields are left out when the extraction has none', () => {
  const { body } = requestFor({ pageType: 'video', url: 'https://youtube.com/watch?v=x', video: { videoId: 'x', title: 'T', channel: '' } });
  assert.deepEqual(body, { url: 'https://youtube.com/watch?v=x', videoId: 'x', title: 'T' });
});

test('signed in: Bearer token is sent', async () => {
  const session = await signIn();
  const calls = installFetch(() => jsonResponse(200, { ...RESULT, saved: true }));
  const result = await analyze(previewSample('article'));
  assert.equal(authHeaderOf(calls[0]), `Bearer ${session.token}`);
  assert.equal(result.saved, true);
});

test('content problems map to the failure view with the backend message', async () => {
  for (const [code, status] of [['NO_CAPTIONS', 422], ['CONTENT_TOO_SHORT', 422], ['VIDEO_NOT_FOUND', 404]]) {
    installFetch(() => jsonResponse(status, { code, message: `backend says ${code}` }));
    await assert.rejects(analyze(previewSample('video')), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.view, 'failure');
      assert.equal(error.message, `backend says ${code}`);
      return true;
    });
  }
});

test('service problems map to the error view with a friendly line', async () => {
  for (const [code, status] of [['MODEL_UNAVAILABLE', 502], ['RATE_LIMITED', 429]]) {
    installFetch(() => jsonResponse(status, { code, message: 'upstream detail' }));
    await assert.rejects(analyze(previewSample('article')), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.view, 'error');
      assert.notEqual(error.message, 'upstream detail');
      assert.ok(error.message.length > 20);
      return true;
    });
  }
});

test('unreachable backend → NETWORK_ERROR, error view, "is the backend running?"', async () => {
  installFetch(networkFailure);
  await assert.rejects(analyze(previewSample('article')), (error) => {
    assert.equal(error.code, 'NETWORK_ERROR');
    assert.equal(error.view, 'error');
    assert.match(error.message, /is the backend running\?/);
    return true;
  });
});

test('a non-JSON error status still becomes an error-view Error', async () => {
  installFetch(() => new Response('<html>Bad gateway</html>', { status: 502 }));
  await assert.rejects(analyze(previewSample('article')), (error) => {
    assert.equal(error.code, 'HTTP_502');
    assert.equal(error.view, 'error');
    return true;
  });
});

test('the request is abandoned after the analysis timeout → TIMEOUT, error view', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { handler, started } = hangingFetch();
  installFetch(handler);
  const pending = analyze(previewSample('video'));
  await started;
  mock.timers.tick(ANALYZE_TIMEOUT_MS);
  await assert.rejects(pending, (error) => {
    assert.equal(error.code, 'TIMEOUT');
    assert.equal(error.view, 'error');
    return true;
  });
});

test('SESSION_EXPIRED: the token is dropped and the analysis is retried signed out', async () => {
  await signIn();
  const calls = installFetch(({ call }) =>
    (call === 1 ? jsonResponse(401, { code: 'SESSION_EXPIRED', message: 'Session expired' }) : jsonResponse(200, RESULT)));
  const result = await analyze(previewSample('article'));
  assert.deepEqual(result, RESULT);
  assert.equal(calls.length, 2);
  assert.ok(authHeaderOf(calls[0]).startsWith('Bearer '));
  assert.equal(authHeaderOf(calls[1]), undefined);
  assert.equal(await getSession(), null);
});

test('an already-expired stored token is never sent', async () => {
  await saveSession({ token: makeToken({ exp: FUTURE - 3600 }), user: { email: 'old@veritas.app' } });
  const calls = installFetch(() => jsonResponse(200, RESULT));
  await analyze(previewSample('article'));
  assert.equal(authHeaderOf(calls[0]), undefined);
  assert.equal(globalThis.localStorage.size, 0);
});
