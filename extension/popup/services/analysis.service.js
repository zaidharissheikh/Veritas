// Live analysis: POSTs the extraction to the backend (BACKEND_CONTRACT §2, §5) and resolves
// to an AnalysisResult plus `saved`. Rejects with an Error carrying `code` and `view`:
// 'failure' when this content cannot be checked, 'error' when the service itself failed.
import { ANALYZE_TIMEOUT_MS } from '../config.js';
import { postJson } from './http.js';
import { clearSession, getSession } from './auth.js';

// Backend codes that describe the content rather than the service; the backend's own
// message is shown, like an extraction failure.
const CONTENT_CODES = new Set(['NO_CAPTIONS', 'CONTENT_TOO_SHORT', 'VIDEO_NOT_FOUND']);

const SERVICE_MESSAGES = {
  MODEL_UNAVAILABLE: 'The analysis model is unavailable right now. Try again in a moment.',
  RATE_LIMITED: 'Veritas is checking too many pages at once. Wait a moment and try again.',
};

const FALLBACK_MESSAGE = 'The analysis service is not responding right now.';

export async function analyze(extraction) {
  const request = requestFor(extraction);
  const session = await getSession();
  try {
    return await send(request, session && session.token);
  } catch (error) {
    // An expired token must never block a check: forget it and continue signed out.
    if (error.code === 'SESSION_EXPIRED' && session) {
      await clearSession();
      return send(request, null);
    }
    throw error;
  }
}

export function requestFor(extraction) {
  if (extraction.pageType === 'video') {
    const { videoId, title, thumbnailUrl, channel } = extraction.video || {};
    return { path: '/analyze/video', body: compact({ url: extraction.url, videoId, title, thumbnailUrl, channel }) };
  }
  const { headline, body } = extraction.article || {};
  return { path: '/analyze/article', body: { url: extraction.url, headline, body } };
}

async function send(request, token) {
  try {
    return await postJson(request.path, request.body, { token, timeoutMs: ANALYZE_TIMEOUT_MS });
  } catch (error) {
    throw analysisError(error);
  }
}

function analysisError(error) {
  const code = error.code || 'UNKNOWN';
  const mapped = new Error(SERVICE_MESSAGES[code] || error.message || FALLBACK_MESSAGE);
  mapped.code = code;
  mapped.view = CONTENT_CODES.has(code) ? 'failure' : 'error';
  return mapped;
}

// Optional fields (thumbnailUrl, channel) are left out when the extraction had none.
function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value != null && value !== ''));
}
