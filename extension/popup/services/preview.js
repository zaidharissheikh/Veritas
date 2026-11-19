// Design preview: the popup opened as a plain web page (no chrome.scripting), e.g.
//   http://localhost:8123/popup/popup.html?scenario=video&auth=in&sheet=open&theme=dark
// Query params set up a UI state so every screen can be screenshotted without the
// extension or the backend:
//   scenario=…      which canned extraction to use (see extract.samples.js)
//   auth=in|out     start signed in (demo account, fake token) or signed out
//   sheet=open      open the sign-in sheet straight away
//   theme=dark|light force a colour scheme
//   latency=<ms>    how long the mock analysis takes (to look at the loading steps)
import { clearSession, saveSession } from './auth.js';

export function isDesignPreview() {
  return typeof chrome === 'undefined' || !(chrome.scripting && chrome.tabs);
}

export function previewParam(name) {
  const search = globalThis.location ? globalThis.location.search : '';
  return new URLSearchParams(search).get(name);
}

export async function applyPreviewSetup() {
  if (!isDesignPreview()) return;
  const theme = previewParam('theme');
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
  const auth = previewParam('auth');
  if (auth === 'in') await saveSession(previewSession());
  if (auth === 'out') await clearSession();
}

// A JWT-shaped token for the demo account that expires in 2100, so signed-in states render offline.
export function previewSession() {
  const payload = { sub: 'usr_preview', email: 'demo@veritas.app', exp: 4102444800 };
  const token = ['preview', base64Url(JSON.stringify(payload)), 'preview'].join('.');
  return { token, user: { id: payload.sub, email: payload.email, createdAt: '2026-10-01T00:00:00.000Z' } };
}

function base64Url(text) {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
