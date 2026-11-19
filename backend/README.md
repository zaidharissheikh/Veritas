# Veritas backend

FastAPI + SQLite API for the Veritas extension and dashboard. It registers users, analyses articles and YouTube videos with **Gemini**, stores each signed-in user's history and builds the Information Diet. Contracts: `../docs/BACKEND_CONTRACT.md` (API and rules) and `../docs/CONTRACTS.md` (data shapes).

Stack: FastAPI, uvicorn, SQLAlchemy 2 + SQLite, PyJWT, bcrypt, httpx, youtube-transcript-api, pydantic v2, pytest.

## Setup (Windows PowerShell, Python 3.14)

```powershell
cd backend
py -3.14 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
```

Then open `backend\.env` and fill it in. On macOS or Linux use `.venv/bin/python` and `cp`.

| Variable | Needed | Meaning |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Key from Google AI Studio. Used for every analysis. |
| `YOUTUBE_API_KEY` | yes, for videos | YouTube Data API v3 key (Google Cloud Console). Used to look up a video's real title, channel and thumbnail. |
| `JWT_SECRET` | yes, in practice | Signs login tokens. Any long random string. Empty means a built-in dev-only secret and a warning at startup. |
| `BREVO_API_KEY` | yes, for account email | Restricted Brevo API key with Transactional email: All. |
| `EMAIL_FROM` | yes, for account email | Sender email verified in Brevo. |
| `FRONTEND_URL` | no | Dashboard address used in verification and reset links; defaults to `http://localhost:5173`. Use a public HTTPS URL when deployed. |
| `VERIFICATION_TTL_MINUTES` | no | Verification link lifetime; defaults to 30 minutes. |
| `PASSWORD_RESET_TTL_MINUTES` | no | Password reset link lifetime; defaults to 15 minutes (1–60). |
| `GEMINI_MODELS` | no | Comma-separated model chain, tried in order. Default `gemini-3.6-flash,gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.5-flash`. A model that answers 429, a server error or times out is skipped for about a minute and the next one is used. |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | no | Older overrides. If set, they are put at the front of the chain. |
| `JWT_TTL_MINUTES` | no | Token lifetime, default 30. Set `1` to see session expiry quickly. |
| `DATABASE_URL` | no | Default is `backend/veritas.db`. |
| `SEED_DEMO` | no | `false` skips creating the demo account. |
| `CORS_ORIGIN_REGEX` | no | Replaces the allowed-origin pattern (see Troubleshooting). |

`.env` is git-ignored. API keys are read by `app/config.py`, are hidden when settings are printed, and are sent only to their respective providers. They are never returned by the API or put in error messages. Do not paste them into chat or a commit; if one leaks, revoke it and make a new one.

Registration requires email verification before sign-in. See [Email verification](../docs/EMAIL_VERIFICATION.md) for setup, existing-account migration, backups, resend limits, and manual testing.

See [Password recovery and email validation](../docs/PASSWORD_RECOVERY.md) for reset links, session revocation, domain checks, and test commands.

## Run

```powershell
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

- Health: <http://localhost:8000/health> returns `{"status":"ok","geminiConfigured":true,"youtubeConfigured":true}`. The two flags say whether a key is set, never what it is.
- Interactive docs: <http://localhost:8000/docs>.
- After changing `.env`, restart uvicorn. `--reload` only watches code.

On first start it creates `veritas.db` and the demo account `demo@veritas.app` / `Veritas123!` with about 60 sample analyses (`isMock: true`, dates shifted so they look recent). New accounts start empty. To start fresh, stop the server and delete `veritas.db`.

## Endpoints

Base `http://localhost:8000`. JSON, camelCase. Auth is `Authorization: Bearer <token>`.

| Method + path | Auth | Body or query, response |
| --- | --- | --- |
| `GET /health` | none | `{ status, geminiConfigured, youtubeConfigured }` |
| `POST /auth/register` | none | `{ email, password }` gives 201 `{ user }`. Password: 8+ characters, a letter and a number, no whitespace, up to 72 UTF-8 bytes. Email syntax and domain mail delivery are checked; verification is required. |
| `POST /auth/verify-email` | none | `{ token }` consumes a valid email token and activates the account. |
| `POST /auth/resend-verification` | none | `{ email }` requests a replacement link with a generic response and rate limits. |
| `POST /auth/login` | none | `{ email, password }` gives `{ user, token }`. Token is a JWT (HS256) with `sub`, `email`, `exp`, `ver`. |
| `POST /auth/forgot-password` | none | `{ email }` queues a reset email for a verified account; always returns the same generic confirmation. |
| `POST /auth/reset-password` | none | `{ token, password }` consumes a reset link, hashes the new password, and invalidates all existing login tokens. |
| `GET /auth/me` | required | `{ user }` |
| `POST /analyze/article` | optional | `{ url, headline, body }` gives an AnalysisResult plus `saved`. Body needs 80+ words. |
| `POST /analyze/video` | optional | `{ url, videoId, title, thumbnailUrl?, channel? }` gives an AnalysisResult plus `saved`. Title, channel and thumbnail are re-read from YouTube, not trusted from the client. |
| `GET /history` | required | `?type=all\|article\|video&period=7d\|30d\|90d\|all&query=` gives AnalysisResult[], newest first |
| `GET /history/{id}` | required | One AnalysisResult. Other users' ids are also `NOT_FOUND`. |
| `GET /diet?period=7d\|30d\|90d\|all` | required | `{ points, riskMix, byType, averageScore, previousAverageScore, totalAnalyses, topTerms }` |

"Optional" auth: without a valid token an analysis still runs and returns `saved: false`. With a valid token the result is stored for that user (one row per URL: analysing the same URL again updates it) and `saved` is `true`.

Every error is an HTTP error status with `{ "code", "message" }`:

| Code | Status | When |
| --- | --- | --- |
| `INVALID_INPUT` | 422 | Bad request body or query, weak password, bad email |
| `INVALID_RESET_TOKEN` | 400 | Unknown, expired, or already-used password reset link |
| `EMAIL_TAKEN` | 409 | Registering an existing email |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `SESSION_EXPIRED` | 401 | Missing, invalid or expired token on a protected route |
| `NOT_FOUND` | 404 | Unknown or not-yours history id |
| `CONTENT_TOO_SHORT` | 422 | Article body under 80 words |
| `NO_CAPTIONS` | 422 | Video has no English captions |
| `VIDEO_NOT_FOUND` | 404 | YouTube has no such video (private or removed) |
| `RATE_LIMITED` | 429 | Gemini or YouTube quota used up |
| `MODEL_UNAVAILABLE` | 502 | Gemini or YouTube failed, or a key is missing or rejected |

## How an analysis runs

1. `routers/analyze.py` validates the request, calls the analyzer, then saves for signed-in users.
2. `analysis/article_analyzer.py` and `video_analyzer.py` check the **cache** (`analysis/cache.py`): an in-memory TTL cache, 24 hours, up to 500 entries, keyed by a SHA-256 of the normalised input (article: URL + headline + body; video: video ID + title). Its `get(key)` / `set(key, value)` interface is what a Redis version would implement. It caches the model's answer; ids and timestamps are created fresh each time.
3. **Article:** the body is cut to about 6,000 words (start and end kept) and one Gemini call returns stance, confidence, sensationalism, summary and highlight words.
4. **Video:** `youtube.py` fetches the snippet (YouTube Data API) and the thumbnail (only from `i.ytimg.com`, size-capped, best effort), `transcript.py` fetches English captions (manual preferred over auto-generated) and keeps a head, middle and tail sample of up to 12,000 characters, then one Gemini call gets title, transcript sample and image.
5. `analysis/gemini.py` calls Gemini over REST in JSON mode with a response schema, temperature 0.2, 45 second timeout. A failed call is retried once, then the fallback model is tried once. `analysis/prompts.py` puts all page, title and transcript text between `<<<CONTENT` and `CONTENT>>>` markers and tells the model to treat it as data only.
6. `analysis/scoring.py` (pure functions, unit-tested) builds the AnalysisResult: gauges, risk score and level, excerpt (at most 60 words) and the highlights' `tokenIndex` positions. Highlights the model made up (words not in the excerpt) are dropped.

Scoring formulas (scores 0 to 100; level: below 34 low, below 67 medium, otherwise high):

| Content | Gauges | Risk score |
| --- | --- | --- |
| Article | `sensationalism` (model), `mismatch` = `base[stance] x conf + 30 x (1 - conf)` with base Agrees 5, Discusses 35, Unrelated 80, Disagrees 95 | `0.6 x max + 0.4 x min` of the two gauges |
| Video | `baitSwitch` (model), `titleHype` (model) | `0.65 x baitSwitch + 0.35 x titleHype` |

Real analyses have `isMock: false`. Only the seeded demo rows have `isMock: true`.

## Tests

```powershell
.venv\Scripts\python -m pytest
```

Tests use a temporary SQLite file and fake keys. Gemini, YouTube and the transcript library are mocked, so nothing touches the network and no real key is needed.

## Troubleshooting

- **`/health` says a key is not configured:** the value is missing from `backend\.env`, or uvicorn was not restarted after you saved it.
- **`MODEL_UNAVAILABLE`:** a key is wrong, Gemini or YouTube is down, or the model name is not open to your key. Look at the server log (it names the model and HTTP status, never the key or the prompt) and change the `GEMINI_MODELS` chain (list the models your key can use with `GET https://generativelanguage.googleapis.com/v1beta/models`). A caption fetch can also fail temporarily when YouTube refuses the request: retry later.
- **`RATE_LIMITED`:** free-tier quota. Wait, or check the same page again later (cached results cost nothing).
- **CORS error in a browser:** allowed origins are `http://localhost:<port>`, `http://127.0.0.1:<port>` and `chrome-extension://<id>`. Use `http://localhost:5173` for the dashboard, or set `CORS_ORIGIN_REGEX`.
- **Port 8000 is busy:** run on another `--port`, then update `API_BASE_URL` in `extension/popup/config.js` and `VITE_API_URL` for the dashboard.

## Layout

```
app/main.py          app factory, CORS, error handlers, startup seed
app/config.py        settings from environment and .env
app/db.py models.py repository.py     storage (SQLAlchemy, SQLite)
app/schemas.py       API shapes (camelCase JSON)
app/security.py      bcrypt, JWT, required/optional auth dependencies
app/errors.py        ApiError and the single {code, message} shape
app/diet_summary.py periods.py        Information Diet maths and time windows
app/routers/         auth, analyze, history, diet, health
app/analysis/        article_analyzer, video_analyzer, gemini, gemini_payload, prompts,
                     outputs, scoring, youtube, transcript, text, cache, http
app/seed/            demo account and demo_history.json
tests/               pytest
```
