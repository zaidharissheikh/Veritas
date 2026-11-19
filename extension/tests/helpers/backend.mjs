// Fakes for the service tests: a recording fetch, JSON responses, a localStorage stand-in
// and JWT-shaped tokens with a chosen expiry. No real network, no real keys.

export function installFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler({ url: String(url), init, call: calls.length });
  };
  return calls;
}

export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function networkFailure() {
  return Promise.reject(new TypeError('fetch failed'));
}

// Resolves `started` once fetch is called, then rejects only when the request is aborted.
export function hangingFetch() {
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const handler = ({ init }) =>
    new Promise((_, reject) => {
      markStarted();
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  return { handler, started };
}

export function fakeLocalStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    get size() { return map.size; },
  };
}

export function fakeChromeStorage() {
  const data = {};
  return {
    data,
    storage: {
      local: {
        get: async (key) => (key in data ? { [key]: data[key] } : {}),
        set: async (items) => Object.assign(data, items),
        remove: async (key) => { delete data[key]; },
      },
    },
  };
}

export function makeToken({ exp, email = 'demo@veritas.app', sub = 'usr_test' } = {}) {
  const payload = exp === undefined ? { sub, email } : { sub, email, exp };
  return ['hdr', base64Url(JSON.stringify(payload)), 'sig'].join('.');
}

export function bodyOf(call) {
  return JSON.parse(call.init.body);
}

export function authHeaderOf(call) {
  return call.init.headers.Authorization;
}

function base64Url(text) {
  return Buffer.from(text, 'utf8').toString('base64url');
}
