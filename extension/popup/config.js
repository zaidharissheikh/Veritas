// Where the popup talks to (BACKEND_CONTRACT §5). No secrets live here: the Gemini and
// YouTube keys stay in backend/.env and never reach the extension.
export const API_BASE_URL = 'http://localhost:8000';
export const DASHBOARD_URL = 'http://localhost:5173';

// Video analysis fetches captions and a thumbnail server-side before scoring, so it can
// legitimately take 5–30 s; sign-in should answer quickly.
export const ANALYZE_TIMEOUT_MS = 60000;
export const AUTH_TIMEOUT_MS = 15000;
