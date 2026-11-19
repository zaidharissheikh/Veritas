import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createApp, input, signIn, signedOut, sleep, submit, token, until } from './helpers/app.mjs';

let app;
afterEach(() => { app?.close(); app = null; });

test('forgot-password link preserves email, rejects invalid input, and limits repeat submissions', async () => {
  app = createApp();
  const { w, requests } = app;
  await signedOut(w);
  input(w, '#login-email', 'user@example.com');
  await sleep(0);
  w.document.querySelector('a[href="/forgot-password"]').click();
  await until(() => w.document.querySelector('#reset-email'));
  assert.equal(w.document.querySelector('#reset-email').value, 'user@example.com');
  input(w, '#reset-email', 'bad..email@example.com');
  await submit(w);
  await until(() => w.document.querySelector('#reset-email-error'));
  assert.equal(requests.length, 0);
  input(w, '#reset-email', 'user@example.com');
  await submit(w);
  await until(() => w.document.body.textContent.includes('If an eligible account exists'));
  assert.deepEqual(requests[0].body, { email: 'user@example.com' });
  await submit(w);
  await until(() => w.document.body.textContent.includes('Please wait one minute'));
  assert.equal(requests.length, 1);
});

test('reset form clears sessions and URL token, validates confirmation, and redirects after explicit submission', async () => {
  const resetToken = 'a'.repeat(43);
  app = createApp('/reset-password?token=' + resetToken, { saved: true });
  const { w, requests } = app;
  await until(() => w.document.querySelector('#new-password'));
  assert.equal(w.location.search, '');
  assert.equal(w.sessionStorage.getItem('veritas.token'), null);
  assert.equal(requests.length, 0, 'Opening the link must never consume it, including under StrictMode');
  input(w, '#new-password', 'NewPassw0rd!');
  input(w, '#confirm-password', 'WrongPass1');
  await submit(w);
  await until(() => w.document.querySelector('#confirm-password-error'));
  assert.equal(requests.length, 0);
  input(w, '#new-password', 'New Pass1');
  input(w, '#confirm-password', 'New Pass1');
  await submit(w);
  await until(() => w.document.querySelector('#new-password-error'));
  assert.equal(requests.length, 0);
  input(w, '#new-password', 'NewPassw0rd!');
  input(w, '#confirm-password', 'NewPassw0rd!');
  await submit(w);
  await signedOut(w);
  assert.equal(w.location.search, '?reset=1');
  assert.ok(w.document.body.textContent.includes('Sign in with your new password'));
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], { pathname: '/auth/reset-password', body: { token: resetToken, password: 'NewPassw0rd!' } });
});

test('expired reset links show a useful error and a new-link action', async () => {
  app = createApp('/reset-password?token=' + 'b'.repeat(43), {
    reply: () => ({ status: 400, body: { code: 'INVALID_RESET_TOKEN', message: 'Invalid token' } }),
  });
  const { w } = app;
  await until(() => w.document.querySelector('#new-password'));
  input(w, '#new-password', 'NewPassw0rd!');
  input(w, '#confirm-password', 'NewPassw0rd!');
  await submit(w);
  await until(() => w.document.body.textContent.includes('invalid, expired, or already used'));
  assert.ok(w.document.querySelector('a[href="/forgot-password"]'));
});

test('missing reset token shows recovery instructions without accepting a new password', async () => {
  app = createApp('/reset-password');
  await until(() => app.w.document.body.textContent.includes('Open the complete link'));
  assert.equal(app.w.document.querySelector('form'), null);
  assert.equal(app.requests.length, 0);
});

test('Back to login or registration ends the session and Forward cannot reopen home', async () => {
  app = createApp('/register');
  const { w } = app;
  await signedOut(w, '/register');
  w.document.querySelector('a[href="/login"]').click();
  await signedOut(w);
  await signIn(w);
  w.document.querySelector('a[href="/history"]').click();
  await until(() => w.location.pathname === '/history');
  w.history.back();
  await until(() => w.location.pathname === '/');
  assert.equal(w.sessionStorage.getItem('veritas.token'), token);
  w.history.back();
  await signedOut(w);
  w.history.forward();
  await sleep(100);
  await signedOut(w);
  await signIn(w);
  w.history.go(-3);
  await signedOut(w, '/register');
  w.history.go(3);
  await sleep(100);
  await signedOut(w);
});

test('a late session restore cannot authenticate after entering an auth page', async () => {
  app = createApp('/', { saved: true, reply: async (request) => {
    if (request.pathname === '/auth/me') await sleep(300);
  } });
  const { w, requests } = app;
  await until(() => requests.some((request) => request.pathname === '/auth/me'));
  w.history.pushState({}, '', '/login');
  w.dispatchEvent(new w.PopStateEvent('popstate'));
  await sleep(400);
  await signedOut(w);
  w.history.back();
  await sleep(100);
  await signedOut(w);
});
