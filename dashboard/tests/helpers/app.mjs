// Uses the repository's existing extension jsdom dependency; install dependencies in both projects.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from '../../../extension/node_modules/jsdom/lib/api.js';

const dashboard = fileURLToPath(new URL('../..', import.meta.url));
const build = spawnSync(process.execPath, [path.join(dashboard, 'node_modules/esbuild/bin/esbuild'),
  'src/main.jsx', '--bundle', '--format=iife', '--jsx=automatic', '--define:import.meta.env={}',
  '--loader:.woff2=file', '--loader:.woff=file', '--outdir=node_modules/.cache/ui-tests'],
{ cwd: dashboard, stdio: 'inherit' });
assert.equal(build.status, 0, 'The dashboard UI test bundle must compile');
const code = readFileSync(path.join(dashboard, 'node_modules/.cache/ui-tests/main.js'), 'utf8');
const user = { id: 'usr_test', email: 'user@example.com' };
export const token = btoa('{}') + '.' + btoa(JSON.stringify({ sub: user.id, email: user.email,
  exp: Math.floor(Date.now() / 1000) + 1800, ver: 0 })) + '.test';
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function until(check) {
  for (let i = 0; i < 150; i++) {
    if (check()) return;
    await sleep(20);
  }
  assert.fail('Timed out waiting for the expected UI');
}

export function createApp(route = '/login', { saved = false, reply } = {}) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error.message));
  console.on('error', (...args) => errors.push(args.join(' ')));
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' + route,
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const w = dom.window;
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {};
  if (saved) w.sessionStorage.setItem('veritas.token', token);
  const requests = [];
  w.fetch = async (url, options = {}) => {
    const pathname = new URL(url, w.location.origin).pathname;
    const request = { pathname, body: options.body ? JSON.parse(options.body) : null };
    requests.push(request);
    const custom = await reply?.(request);
    const body = pathname === '/auth/login' ? { user, token } : pathname === '/auth/forgot-password'
      ? { message: 'If an eligible account exists for this email, a password reset link will be sent.' }
      : pathname.startsWith('/auth/') ? { user } : pathname === '/history' ? []
        : { totalAnalyses: 0, points: [], topTerms: [], riskMix: {}, byType: {}, averageScore: null };
    return { ok: !custom?.status || custom.status < 400, status: custom?.status ?? 200,
      json: async () => custom?.body ?? body };
  };
  w.eval(code);
  return { w, requests, close() { dom.window.close(); assert.deepEqual(errors, []); } };
}

export function input(w, selector, value) {
  const el = w.document.querySelector(selector);
  assert.ok(el, 'Input must exist: ' + selector);
  Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
}

export async function submit(w) {
  await sleep(0);
  w.document.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
}

export async function signIn(w) {
  input(w, '#login-email', user.email);
  input(w, '#login-password', 'Passw0rd!');
  await submit(w);
  await until(() => w.location.pathname === '/' && w.document.querySelector('nav'));
}

export async function signedOut(w, route = '/login') {
  const field = route === '/login' ? '#login-email' : '#register-email';
  await until(() => w.location.pathname === route && w.document.querySelector(field));
  assert.equal(w.sessionStorage.getItem('veritas.token'), null);
  assert.equal(w.document.querySelector('nav'), null);
}
