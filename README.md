# Veritas

Veritas estimates how likely an article or a YouTube video is to be **manipulative**: sensationalism, headline-body mismatch, bait-and-switch. It is a final-year project (requirements in [`docs/SRS_extracted.txt`](docs/SRS_extracted.txt)).

Scores measure the *likelihood of manipulation*, **not** whether content is factually true.

## What runs where

```
Chrome extension --\                       /--> Gemini API (scores, summary)
 (reads the page)   >-- FastAPI backend --+---> YouTube Data API (title, thumbnail)
React dashboard ---/   localhost:8000      \--> youtube-transcript-api (captions)
 localhost:5173        SQLite file + cache
```

| Part | Folder | What it does |
| --- | --- | --- |
| Backend | `backend/` | FastAPI. Accounts, analysis, history, Information Diet. The **only** place that holds the Gemini and YouTube keys. |
| Dashboard | `dashboard/` | React + Vite. Register, sign in, Information Diet charts, Analysis History, detail with highlighted words. |
| Extension | `extension/` | Chrome Manifest V3. Reads the open page (Readability.js for articles, DOM for YouTube), asks the backend, shows two gauges, a risk badge, a summary and a word cloud. |

Folder map:

```
backend/              FastAPI app, tests, requirements.txt, .env.example   (see backend/README.md)
dashboard/            React + Vite web dashboard                          (see dashboard/README.md)
extension/            Chrome extension, no build step                      (see extension/README.md)
shared/tokens.css     Design tokens (the one canonical copy)
scripts/sync-tokens.mjs   Copies the tokens into dashboard and extension
docs/                 CONTRACTS.md (shapes, rules), BACKEND_CONTRACT.md (API), SRS_extracted.txt
```

## Start everything

You need Python 3.14, Node.js 18 or newer, Chrome 102 or newer, a **Gemini API key** (Google AI Studio) and a **YouTube Data API v3 key** (Google Cloud Console). Start the backend first. Commands are for Windows PowerShell; on macOS or Linux use `.venv/bin/python` and `cp`.

### 1. Backend (port 8000)

```powershell
cd backend
py -3.14 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
```

Open `backend\.env` in an editor and fill in `GEMINI_API_KEY`, `YOUTUBE_API_KEY` and `JWT_SECRET` (any long random string; the file explains how to make one). Then:

```powershell
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Check it at <http://localhost:8000/health>. You should see `"status":"ok"` and both `...Configured` flags `true`. The flags say whether a key is set; the keys themselves are never returned. Interactive API docs: <http://localhost:8000/docs>.

### 2. Dashboard (port 5173)

```powershell
cd dashboard
npm install
npm run dev
```

Open <http://localhost:5173> and sign in with the demo account `demo@veritas.app` / `Veritas123!` (it has about 60 sample analyses). Any new account starts with an empty history.

### 3. Extension

1. Open `chrome://extensions` and switch on **Developer mode**.
2. Click **Load unpacked**.
3. Choose the **inner `extension` folder**: `D:\Coding\Python\extension\extension` (the one that contains `manifest.json`). Do **not** choose the project root `D:\Coding\Python\extension`: Chrome will say the manifest is missing.
4. Pin Veritas from the puzzle-piece menu, open a news article or a YouTube video and click the icon.

Optional: in the popup footer click **Sign in to save to your history** and use the same account as the dashboard. Signed-in results are saved and appear in the dashboard; signed-out results are shown but not stored.

Full test pages and the offline design preview are in [`extension/README.md`](extension/README.md).

## How analysis works

1. The popup injects a reader into the open tab. **Articles:** Readability.js parses a *copy* of the page (the live page is never changed) and needs at least 80 words. **Videos:** it reads the video ID and title from the YouTube watch page.
2. The popup sends `POST /analyze/article` (url, headline, body) or `POST /analyze/video` (url, video ID, title). If you are signed in it adds your token.
3. The backend checks its **cache** first. On a miss:
   - **Article:** one Gemini call judges headline-vs-body stance (Agrees, Disagrees, Discusses, Unrelated), sensationalism, a short summary and the manipulative words.
   - **Video:** the YouTube Data API gives the real title, channel and thumbnail; `youtube-transcript-api` fetches the English captions; Gemini sees the title, a transcript sample and the thumbnail image and scores bait-and-switch and title hype.
4. `scoring.py` (plain Python, unit-tested) turns the model's answer into the gauges, the risk score and the highlight positions. The result goes back to the popup and, for signed-in users, into SQLite.
5. The dashboard reads that history and builds the Information Diet charts from it.

How this differs from the SRS, on purpose:

| SRS says | This build does | Why |
| --- | --- | --- |
| Fine-tuned BERT for stance and sensationalism; ViT + RoBERTa for videos | **Gemini** with a structured-output prompt | No GPU or training data needed for the demo. The model call sits behind one function, so it can be swapped. |
| Redis cache | **In-memory cache** (`backend/app/analysis/cache.py`), 24 h, up to 500 entries, same `get`/`set` interface | Nothing extra to install. A restart empties it. |
| Transcript retrieval | `youtube-transcript-api` on the backend, no key needed | Captions only; there is no speech-to-text. |

Page text, headlines and transcripts are treated as untrusted. They go into the prompt between `<<<CONTENT` and `CONTENT>>>` markers and the system instruction tells the model to ignore any instructions found there.

### Scoring

All scores are 0 to 100. Risk level: below 34 is **Low risk**, 34 to 66 is **Moderate risk**, 67 and above is **High risk**.

| Content | Gauge 1 | Gauge 2 | Overall risk score |
| --- | --- | --- | --- |
| Article | Sensationalism: from the model | Headline mismatch = `base[stance] x confidence + 30 x (1 - confidence)`, with base Agrees 5, Discusses 35, Unrelated 80, Disagrees 95 | `0.6 x max(gauges) + 0.4 x min(gauges)` |
| Video | Bait-and-switch: from the model | Title hype: from the model | `0.65 x bait-and-switch + 0.35 x title hype` |

The weights are our own judgement, not calibrated on a labelled dataset.

## API

Base URL `http://localhost:8000`. JSON, camelCase. Errors are always an HTTP error status plus `{ "code", "message" }`. Details: [`backend/README.md`](backend/README.md) and [`docs/BACKEND_CONTRACT.md`](docs/BACKEND_CONTRACT.md).

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /health` | none | Status and whether the keys are set |
| `POST /auth/register` | none | Create an account |
| `POST /auth/login` | none | Returns `{ user, token }` (JWT, 30 minutes) |
| `POST /auth/forgot-password` | none | Request a password reset email; generic confirmation |
| `POST /auth/reset-password` | none | Choose a new password using a valid, single-use reset link |
| `GET /auth/me` | token | Current user |
| `POST /analyze/article` | optional | Analyse an article; saved only when a valid token is sent |
| `POST /analyze/video` | optional | Analyse a YouTube video; same saving rule |
| `GET /history` | token | Your analyses, filtered by `type`, `period`, `query` |
| `GET /history/{id}` | token | One analysis |
| `GET /diet?period=` | token | Information Diet summary |

## Keys and secrets

- The Gemini and YouTube keys live **only** in `backend/.env`. That file is git-ignored. They are never put in the extension, the dashboard, a URL, a log or a test.
- Do not paste a key into chat, an issue, a screenshot or a commit. If one has ever been shared anywhere, revoke it in Google's console and create a new one.
- The dashboard's `VITE_*` variables and the extension's `popup/config.js` are visible to anyone who opens them, so they hold only addresses.

## Known limitations

- **Free-tier limits.** Gemini and the YouTube Data API have small quotas. Hitting them shows "RATE_LIMITED" (the popup offers Retry). The cache only helps when the same page is checked again.
- **Videos without captions** cannot be checked ("This video has no captions, so Veritas can't check it"). Captions in other languages do not count.
- **English only.** The prompts and the caption lookup assume English.
- **Scores measure manipulation likelihood, not truth.** Gemini is prompted at a low temperature, but the same page can still score a few points differently on a fresh run. Never read a score as "this is false".
- Long inputs are shortened: articles to about 6,000 words (start and end kept), transcripts to a 12,000-character sample.
- The cache lives in memory: it is lost on restart and not shared between processes.
- Local development setup: SQLite file and localhost-only CORS. Email verification and password recovery use Brevo and per-process request limits; public deployments need shared rate limits. Without `JWT_SECRET` the server uses a built-in dev-only secret and warns.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Popup says "Can't reach the Veritas server", or the dashboard says "Is the backend running?" | Start the backend (step 1) and open <http://localhost:8000/health>. If you used another port, change `API_BASE_URL` in `extension/popup/config.js` and `VITE_API_URL` in `dashboard/.env.local`, then reload the extension. |
| Chrome: "Manifest file is missing or unreadable" in Load unpacked | You picked the project root. Pick `D:\Coding\Python\extension\extension`, the folder with `manifest.json`. |
| Browser console shows a CORS error | The backend only allows `http://localhost:<port>`, `http://127.0.0.1:<port>` and `chrome-extension://` origins. Open the dashboard as `http://localhost:5173`, not by LAN IP or hostname. To allow more, set `CORS_ORIGIN_REGEX` in `backend/.env`. |
| `/health` shows a `...Configured` flag as `false` | The key is missing from `backend\.env` (that exact path). Save it and **restart** uvicorn: `--reload` watches code, not `.env`. |
| `MODEL_UNAVAILABLE` | Gemini or YouTube is down, a key is wrong, or the model name is not open to your key. Check `/health`; change the `GEMINI_MODELS` chain in `backend/.env` (restart the backend after editing `.env`). Google's models are often overloaded: wait a minute and retry. YouTube sometimes refuses the caption fetch temporarily: retry. |
| `RATE_LIMITED` | Free quota used up. Wait a minute, or until the next day for the YouTube quota. |
| Dashboard shows "Session expired" | Tokens last 30 minutes. Sign in again (the extension drops an expired session quietly). |
| Extension change not visible | Click the reload icon on the Veritas card in `chrome://extensions`, then reopen the popup. |
| Dashboard opened on port 5174 | Port 5173 was busy. Stop the other process, because the extension links point to 5173. |
| `Activate.ps1` is blocked | You do not need it: every command above calls `.venv\Scripts\python` directly. |

## Design tokens

`shared/tokens.css` is the only place colours, type, spacing and radii are defined. After editing it, run from the repo root:

```bash
node scripts/sync-tokens.mjs
```

It copies the file to `dashboard/src/styles/tokens.css` and `extension/styles/tokens.css`. Never edit those copies by hand.

## Rules of the road

The full list is in [`docs/CONTRACTS.md`](docs/CONTRACTS.md). The short version:

- Keep files under about 180 lines. Split by component or concern.
- Plain JavaScript and plain CSS with tokens on the front end. No TypeScript, no Tailwind, no state library.
- Never put page text or user text into `innerHTML`.
- Risk is never shown by colour alone: there is always a text label too.
- Anything that is not a real analysis (the seeded demo account, the dashboard's offline mock mode, the popup design preview) carries the "Demo data" chip.
- Never describe content as "fake" or "true". Use "sensationalism", "headline mismatch", "bait-and-switch".

## Checks

| What | Command | Where |
| --- | --- | --- |
| Backend tests (Gemini and YouTube mocked, no network) | `.venv\Scripts\python -m pytest` | `backend/` |
| Dashboard builds | `npm run build` | `dashboard/` |
| Extension tests (50, jsdom) | `npm test` | `extension/` (run `npm install` once first) |

## Next steps

1. **Swap Gemini for the SRS models.** Fine-tune BERT for headline-body stance and build the ViT + RoBERTa late-fusion model for videos. The analyzers already work from small output shapes (`backend/app/analysis/outputs.py`), so replace the `generate_json` call in `article_analyzer.py` and `video_analyzer.py` and keep `scoring.py`.
2. **Redis.** Implement the same `get(key)` / `set(key, value)` interface next to `TtlCache` and switch it on in `cache.py`.
3. **Docker.** A backend image plus a compose file with Redis, as the SRS asks for a containerised service.
4. **Harden for a real deployment.** Set a real `JWT_SECRET`, serve over HTTPS, move from SQLite to a server database with migrations, add `host_permissions` and a CORS entry for the hosted API, add rate limiting.
5. **Evaluate.** Run the scores against a small labelled set and tune the weights in the table above.
6. **Reach.** Speech-to-text for videos without captions; more languages.
