// popup/services/auth.js: storage adapters, expiry handling, login / logout.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearSession, decodeTokenPayload, getSession, isTokenExpired, login, logout, saveSession,
} from '../popup/services/auth.js';
import { previewSession } from '../popup/services/preview.js';
import { API_BASE_URL } from '../popup/config.js';
import { bodyOf, fakeChromeStorage, fakeLocalStorage, installFetch, jsonResponse, makeToken, networkFailure } from './helpers/backend.mjs';

const KEY = 'veritas.session';
const FUTURE = Math.floor(Date.now() / 1000) + 1800;
const USER = { id: 'usr_test', email: 'demo@veritas.app' };

afterEach(async () => {
  await clearSession();
  delete globalThis.chrome;
  delete globalThis.localStorage;
  delete globalThis.fetch;
});

test('uses chrome.storage.local inside the extension', async () => {
  const fake = fakeChromeStorage();
  globalThis.chrome = { storage: fake.storage };
  globalThis.localStorage = fakeLocalStorage();
  const session = { token: makeToken({ exp: FUTURE }), user: USER };
  await saveSession(session);
  assert.deepEqual(fake.data[KEY], session);
  assert.equal(globalThis.localStorage.size, 0, 'localStorage untouched when chrome.storage exists');
  assert.deepEqual(await getSession(), session);
  await clearSession();
  assert.equal(KEY in fake.data, false);
});

test('falls back to localStorage in the design preview', async () => {
  globalThis.localStorage = fakeLocalStorage();
  const session = { token: makeToken({ exp: FUTURE }), user: USER };
  await saveSession(session);
  assert.deepEqual(JSON.parse(globalThis.localStorage.getItem(KEY)), session);
  assert.deepEqual(await getSession(), session);
});

test('keeps the session in memory when no storage exists at all', async () => {
  const session = { token: makeToken({ exp: FUTURE }), user: USER };
  await saveSession(session);
  assert.deepEqual(await getSession(), session);
  await logout();
  assert.equal(await getSession(), null);
});

test('an expired token is cleared from storage and reported as signed out', async () => {
  globalThis.localStorage = fakeLocalStorage();
  await saveSession({ token: makeToken({ exp: FUTURE - 7200 }), user: USER });
  assert.equal(await getSession(), null);
  assert.equal(globalThis.localStorage.getItem(KEY), null);
});

test('a token without exp or with a malformed shape counts as expired', async () => {
  globalThis.localStorage = fakeLocalStorage();
  for (const token of [makeToken(), 'not-a-token', 'a.b', '', undefined]) {
    await saveSession({ token, user: USER });
    assert.equal(await getSession(), null, String(token));
    assert.equal(globalThis.localStorage.size, 0, String(token));
  }
});

test('token helpers decode the payload and honour exp against a given clock', () => {
  const token = makeToken({ exp: 1000, email: 'a@b.com' });
  assert.deepEqual(decodeTokenPayload(token), { sub: 'usr_test', email: 'a@b.com', exp: 1000 });
  assert.equal(isTokenExpired(token, 999 * 1000), false);
  assert.equal(isTokenExpired(token, 1000 * 1000), true);
  assert.equal(decodeTokenPayload('x.y'), null);
});

test('login posts to /auth/login and stores {token, user}', async () => {
  globalThis.localStorage = fakeLocalStorage();
  const token = makeToken({ exp: FUTURE });
  const calls = installFetch(() => jsonResponse(200, { token, user: USER }));
  const session = await login({ email: 'demo@veritas.app', password: 'Veritas123!' });
  assert.equal(calls[0].url, `${API_BASE_URL}/auth/login`);
  assert.deepEqual(bodyOf(calls[0]), { email: 'demo@veritas.app', password: 'Veritas123!' });
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(session, { token, user: USER });
  assert.deepEqual(await getSession(), session);
});

test('login surfaces backend codes and network failures without storing anything', async () => {
  globalThis.localStorage = fakeLocalStorage();
  installFetch(() => jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'Wrong email or password.' }));
  await assert.rejects(login({ email: 'a@b.com', password: 'nope' }), (error) => {
    assert.equal(error.code, 'INVALID_CREDENTIALS');
    assert.equal(error.message, 'Wrong email or password.');
    return true;
  });
  installFetch(networkFailure);
  await assert.rejects(login({ email: 'a@b.com', password: 'nope' }), { code: 'NETWORK_ERROR' });
  assert.equal(await getSession(), null);
});

test('the design-preview session is JWT-shaped and far from expiry', async () => {
  const session = previewSession();
  assert.equal(isTokenExpired(session.token), false);
  assert.equal(session.user.email, 'demo@veritas.app');
  assert.equal(session.token.split('.').length, 3);
});
