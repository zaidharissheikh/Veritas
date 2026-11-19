// Minimal JSON client for the Veritas backend. Every failure becomes an ApiError with a
// stable `code`: the backend's own codes (BACKEND_CONTRACT §2) for HTTP errors, plus
// NETWORK_ERROR / TIMEOUT when the server could not be reached at all.
import { API_BASE_URL } from '../config.js';

const DEFAULT_TIMEOUT_MS = 15000;

export const NETWORK_MESSAGE = "Can't reach the Veritas server — is the backend running?";
export const TIMEOUT_MESSAGE = 'The Veritas server is taking too long to respond. Try again in a moment.';

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function postJson(path, body, { token, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: headersFor(token),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await unwrap(response);
  } catch (error) {
    throw toApiError(error);
  } finally {
    clearTimeout(timer);
  }
}

function headersFor(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function unwrap(response) {
  const data = await readJson(response);
  if (response.ok) return data;
  const code = (data && data.code) || `HTTP_${response.status}`;
  const message = (data && data.message) || `The Veritas server answered with status ${response.status}.`;
  throw new ApiError(code, message, response.status);
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (error && error.name === 'AbortError') return new ApiError('TIMEOUT', TIMEOUT_MESSAGE);
  return new ApiError('NETWORK_ERROR', NETWORK_MESSAGE);
}
