// Optional sign-in (UC-04). The session {token, user} lives in chrome.storage.local, or in
// localStorage when the popup runs as a plain page (design preview). Tokens are JWT-shaped;
// once `exp` has passed the session is dropped so the popup quietly continues signed out.
import { AUTH_TIMEOUT_MS } from '../config.js';
import { postJson } from './http.js';

const KEY = 'veritas.session';

export async function getSession(now = Date.now()) {
  const session = await storage().get();
  if (isLiveSession(session, now)) return session;
  if (session) await storage().remove();
  return null;
}

export async function saveSession(session) {
  await storage().set(session);
  return session;
}

export async function clearSession() {
  await storage().remove();
}

export async function login({ email, password }) {
  const { token, user } = await postJson('/auth/login', { email, password }, { timeoutMs: AUTH_TIMEOUT_MS });
  return saveSession({ token, user });
}

export const logout = clearSession;

export function isTokenExpired(token, now = Date.now()) {
  const payload = decodeTokenPayload(token);
  return !payload || typeof payload.exp !== 'number' || payload.exp * 1000 <= now;
}

// Payload object of a header.payload.signature token, or null when it is not one.
export function decodeTokenPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

function isLiveSession(session, now) {
  return Boolean(session && typeof session.token === 'string' && !isTokenExpired(session.token, now));
}

function base64UrlDecode(part) {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return decodeURIComponent(
    Array.from(atob(padded), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
}

// ── Storage adapters (same get/set/remove shape, picked at call time) ──────────
let memory = null;

const chromeStore = {
  get: async () => (await chrome.storage.local.get(KEY))[KEY] || null,
  set: (value) => chrome.storage.local.set({ [KEY]: value }),
  remove: () => chrome.storage.local.remove(KEY),
};

const localStore = {
  async get() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  },
  async set(value) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      // Storage can be blocked (private mode); the session then lasts only this open.
    }
  },
  async remove() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

const memoryStore = {
  get: async () => memory,
  set: async (value) => { memory = value; },
  remove: async () => { memory = null; },
};

function storage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) return chromeStore;
  if (typeof localStorage !== 'undefined') return localStore;
  return memoryStore;
}
