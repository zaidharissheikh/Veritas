# Veritas extension

Chrome extension (Manifest V3, plain JavaScript modules, **no build step**). Click the toolbar icon on an article or a YouTube video and the popup extracts the page content, sends it to the Veritas backend, and displays a risk result with two gauges, a risk badge, a summary and an XAI word cloud. Signing in (optional) saves each result to your history in the dashboard.

The extraction happens in the page. The scoring happens in the backend (Gemini plus the YouTube Data API and captions); the extension never holds an API key.

## You need the backend running

The popup talks to `http://localhost:8000` (set in `popup/config.js`). Start it from the repo root:

```powershell
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

See `../backend/README.md` for the one-time setup (venv, `requirements.txt`, the `.env` with the keys). How scores are computed is in the [root README](../README.md#how-analysis-works). Without the backend the popup still reads the page, then shows **Analysis unavailable: Can't reach the Veritas server** with a Retry button. The dashboard (`http://localhost:5173`, `popup/config.js` `DASHBOARD_URL`) is only needed for the "Open dashboard", "View" and "Create an account" links.

## Load it in Chrome

> **Pick the inner `extension` folder.** The project root is `D:\Coding\Python\extension`; the extension is the `extension` folder *inside* it, `D:\Coding\Python\extension\extension`. That is the folder that contains `manifest.json`. If you pick the project root, Chrome says "Manifest file is missing or unreadable".

1. Open `chrome://extensions`.
2. Switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose `D:\Coding\Python\extension\extension`.
4. Pin Veritas from the puzzle-piece menu so the icon stays visible.

After you edit any file, click the reload icon on the Veritas card in `chrome://extensions`, then reopen the popup.

Permissions are `activeTab`, `scripting` and `storage` (the sign-in session). There are no host permissions: the backend allows `chrome-extension://` origins through CORS. There is no auto-injected content script; the popup injects the reader into the current tab each time it opens, so it always reads the live page.

## Try it

**On an article**

1. Open any news story or blog post (at least 80 words of text).
2. Click the Veritas icon. The loading card lists what is happening ("Reading the page", "Checking the headline against the text", "Scoring the signals"); a real check takes a few seconds.
3. Open the **Extracted content** disclosure at the bottom of the result to see the headline, byline, site, word count, text preview and a **Copy JSON** button.

**On YouTube**

1. Open a video page (`https://www.youtube.com/watch?v=...`).
2. Click the icon. The backend fetches the captions and the thumbnail before scoring, so this can take 5 to 30 seconds; the loading steps ("Fetching captions", "Checking the title against the transcript", "Scoring the signals") say so. Videos without captions show **Couldn't check this video** with the backend's reason.

**Sign in to keep a history**

The footer row **Sign in to save to your history** opens an inline sheet (email + password, same account as the dashboard; **Create an account** opens the dashboard's register page). Signed in, the footer shows your email and **Sign out**, and each result carries a quiet **Saved to your history** line that links to the dashboard entry. Signed out, results are not stored anywhere and the line says **Not saved to your history** with a **Sign in** link. The demo account `demo@veritas.app` / `Veritas123!` works here too. An expired session (tokens last 30 minutes) is dropped silently and the check continues signed out.

**Pages Veritas should refuse**

| Open this | You should see |
| --- | --- |
| `chrome://extensions`, a new tab, the Chrome Web Store, a PDF, a `file://` page | "Nothing to check here" (Veritas only reads regular web pages) |
| A site home page or a login page | "Nothing to check here", with the note that the page doesn't look like an article |
| A very short news brief | "Couldn't read this page", with the note that it needs 80 or more words |
| A YouTube video without captions | "Couldn't check this video", with the backend's message |

Every failure view has a button that re-runs the whole read.

## Preview the popup without Chrome or the backend

The popup can run as a normal web page for design work. From this folder:

```bash
python -m http.server 8123
```

Then open `http://localhost:8123/popup/popup.html?scenario=video`. Outside the extension the popup uses the mock analysis (`popup/services/analysis.mock.js`, marked "Demo data") and canned extractions from `popup/services/extract.samples.js`, so every screen can be looked at offline. Query parameters set up the state:

| Parameter | Values | What it does |
| --- | --- | --- |
| `scenario` | `article` (default), `video`, `unsupported`, `notArticle`, `short`, `error`, `noCaptions` | Which page was "read"; `error` shows the service-error view, `noCaptions` the backend failure view |
| `auth` | `in`, `out` | Start signed in as the demo account (fake token) or signed out |
| `sheet` | `open` | Open the sign-in sheet straight away |
| `theme` | `dark`, `light` | Force a colour scheme |
| `latency` | milliseconds | How long the mock analysis takes, to watch the loading steps (`latency=40000`) |

Example: `?scenario=article&auth=in&theme=dark`. Size the browser window to about 380 x 580 to see the sheet exactly as the popup shows it. Stop the server with Ctrl+C when you are done. Submitting the sign-in sheet in the preview does call the real backend.

## How it works

```
popup/popup.js            wires the view state to the extract -> analyze flow, footer and sheet
popup/config.js           API_BASE_URL, DASHBOARD_URL, timeouts (no secrets)
popup/state/              viewState.js (loading, result, unsupported, failure, error), flow.js, stages.js (loading steps)
popup/services/extract.js injects the content files, calls window.__veritas.extract()
popup/services/analysis.service.js   POST /analyze/article | /analyze/video, Bearer token when signed in, error mapping
popup/services/auth.js    session in chrome.storage.local (localStorage in the preview), login, logout, expiry
popup/services/http.js    small fetch wrapper: JSON, timeout, {code, message} errors
popup/services/analysis.mock.js      preview-only mock analysis;  preview.js: ?param handling
popup/views/              one file per view, loading steps, footer, sign-in sheet + form, history note
popup/components/         gauge, risk badge, word cloud, extraction panel, chips, buttons, account row
popup/lib/                dom helper, icons, mock heuristics and lexicon
content/                  injected into the page: pageType.js, article.js, youtube.js, extract.js
lib/                      vendored Readability.js (Mozilla, see LICENSE-readability.txt)
styles/                   tokens.css (synced copy) plus base, popup, views and component CSS
tests/                    Node test runner + jsdom tests, fixture pages, fakes for fetch and storage
```

Backend errors map to views like this: `NO_CAPTIONS`, `CONTENT_TOO_SHORT` and `VIDEO_NOT_FOUND` show the failure view with the backend's message; a network failure, a timeout (60 s), `MODEL_UNAVAILABLE` and `RATE_LIMITED` show the error view with Retry; `SESSION_EXPIRED` clears the stored session and the request is sent again without it.

Extraction rules, in short: a page is a YouTube video when the host is `youtube.com`, `www.youtube.com` or `m.youtube.com`, the path is `/watch` and there is a `v` parameter. Everything else is an article. Articles must pass Readability's `isProbablyReaderable` check, are parsed on a **clone** of the page (the live page is never changed) and need at least 80 words. Failures come back as `{ ok: false, reason, message }` with a plain-language message.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| **Analysis unavailable: Can't reach the Veritas server** | The backend is not running, or runs on another port. Start it, then open <http://localhost:8000/health>. If you changed the port, edit `API_BASE_URL` in `popup/config.js` and reload the extension. |
| Load unpacked says "Manifest file is missing or unreadable" | You chose the project root. Choose the inner folder, `D:\Coding\Python\extension\extension`. |
| Edits do not show up | Click the reload icon on the Veritas card in `chrome://extensions`, then reopen the popup. |
| Popup shows an error with a CORS message in the console | The backend only accepts `chrome-extension://` origins and localhost. Make sure you loaded the extension unpacked and the backend is the Veritas one on `API_BASE_URL`. |
| "Nothing to check here" | The tab is not a regular web page (`chrome://`, new tab, Web Store, PDF, `file://`), or the page is not an article or a YouTube watch page. |
| "Couldn't check this video" | No English captions, or the video is private or removed. |
| "Analysis unavailable" with Retry on a video | YouTube or Gemini was slow or refused the request, or the free quota ran out. Wait a minute and press Retry. |
| Results are not saved | You are signed out (footer says "Sign in to save to your history"), or your 30-minute session ended. Sign in again. |
| "Open dashboard" shows nothing | Start the dashboard (`npm run dev` in `dashboard/`). The link points to `DASHBOARD_URL` in `popup/config.js`, default `http://localhost:5173`. |

## Tests

```bash
npm install     # once, installs jsdom
npm test
```

50 tests run in a few seconds with the Node test runner. No test touches the network or a real key:

- `tests/extract.test.mjs`: the content scripts against fixture pages in `tests/fixtures/`, including that the live page is not mutated.
- `tests/extractService.test.mjs`: tab handling, injection order, failure mapping and the `?scenario=` preview samples, using a fake `chrome` API.
- `tests/analysisService.test.mjs`: request shapes for articles and videos, the Bearer header, every backend error code, network failure, the timeout and the expired-session retry, using a fake `fetch`.
- `tests/auth.test.mjs`: chrome.storage / localStorage / in-memory fallbacks, expiry clearing, login and logout.
- `tests/flow.test.mjs`: which view each outcome lands in and the timed loading steps.
- `tests/manifest.test.mjs`: Manifest V3, the three permissions, icons at the declared sizes, injected files exist.

## Design tokens

`styles/tokens.css` is a synced copy of `../shared/tokens.css`. Do not edit it here: change the shared file and run `node scripts/sync-tokens.mjs` from the repo root. Component CSS uses `var(--token)` only.

## Code rules

Files stay under about 180 lines. Page text is only ever inserted with `textContent` or the `h()` helper in `popup/lib/dom.js`, never `innerHTML`. Risk is shown with a text label as well as colour. API keys live only in `backend/.env`; nothing in this folder knows them.
