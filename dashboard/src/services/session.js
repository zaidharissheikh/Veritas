// Session storage for the JWT-shaped token. Lives in sessionStorage so a
// closed tab ends the session, matching the SRS expiry behaviour.

const TOKEN_KEY = 'veritas.token';

function base64UrlDecode(part) {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return decodeURIComponent(
    Array.from(atob(padded), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
}

/** Returns the payload object of a header.payload.signature token, or null. */
function decodeToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function isExpired(payload, now = Date.now()) {
  return typeof payload.exp !== 'number' || payload.exp * 1000 <= now;
}

export function saveSession(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage may be unavailable (private mode); the session just won't persist.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** { user, token } for a live session; null (and cleared) when missing or expired. */
export function getSession() {
  const token = readToken();
  const payload = decodeToken(token);
  if (!payload || isExpired(payload)) {
    clearSession();
    return null;
  }
  const user = { id: payload.sub, email: payload.email };
  return { user, token };
}

/** Milliseconds until the current session expires; 0 when there is none. */
export function msUntilExpiry() {
  const payload = decodeToken(readToken());
  if (!payload || typeof payload.exp !== 'number') return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
}
