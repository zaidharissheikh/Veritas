// Thin fetch wrapper for the Veritas backend. Every call resolves with parsed JSON or rejects
// with an Error carrying `.code` (see ../apiError.js), whatever went wrong.
import { apiError } from '../apiError.js';
import { API_URL } from '../config.js';
import { clearSession, getSession } from '../session.js';

const NETWORK_MESSAGE = "Can't reach the Veritas server. Is the backend running?";
const EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

function buildUrl(path, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const search = params.toString();
  return `${API_URL}${path}${search ? `?${search}` : ''}`;
}

// Protected calls need a live token; without one there is nothing worth sending.
function authorizationHeader() {
  const session = getSession();
  if (!session) throw apiError('SESSION_EXPIRED', EXPIRED_MESSAGE);
  return { Authorization: `Bearer ${session.token}` };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null; // empty or non-JSON body (e.g. a proxy error page)
  }
}

function errorFromResponse(response, body, authenticated) {
  const expired = body?.code === 'SESSION_EXPIRED' || (authenticated && response.status === 401);
  if (expired) {
    clearSession();
    return apiError('SESSION_EXPIRED', EXPIRED_MESSAGE);
  }
  const code = body?.code ?? (response.status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED');
  const message = body?.message ?? `The server answered with status ${response.status}.`;
  return apiError(code, message);
}

async function send(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw apiError('NETWORK_ERROR', NETWORK_MESSAGE);
  }
}

/**
 * request('/history', { query: { type: 'all' }, authenticated: true })
 * `authenticated` adds the Bearer token and turns a rejected token into SESSION_EXPIRED.
 */
export async function request(path, { method = 'GET', body, query, authenticated = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated) Object.assign(headers, authorizationHeader());

  const response = await send(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await readJson(response);
  if (!response.ok) throw errorFromResponse(response, data, authenticated);
  return data;
}
