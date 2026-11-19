# Veritas dashboard

React 18 + Vite web dashboard: register, sign in, see your Information Diet and browse past analyses. Plain JavaScript (JSX), plain CSS with design tokens.

By default it talks to the **Veritas backend** at `http://localhost:8000`, so you must start the backend first (see [`../backend/README.md`](../backend/README.md)). For design work without a backend there is an offline **mock mode** (see below).

## Run

Needs Node.js 18 or newer and the backend running on port 8000.

```bash
npm install
npm test           # email/password validation regression checks
npm run test:ui    # auth UI/navigation checks; also run npm install in ../extension first
npm run dev        # http://localhost:5173
npm run build      # production build into dist/ (must pass before you hand work in)
npm run preview    # serve the built dist/ locally
```

**Demo account:** `demo@veritas.app` / `Veritas123!` (also shown as a hint on the login page). The backend creates it on first start with about 60 sample analyses over the last 120 days. Those rows are marked "Demo data". Any other new account starts with an empty history so you can check the empty states. Analyses you save from the extension while signed in are real and carry no "Demo data" chip.

## Settings

Copy `.env.example` to `.env.local` (git-ignored) only if you need to change something. Vite inlines every `VITE_*` value into the browser bundle, so **never put an API key or secret here**. The Gemini and YouTube keys belong only in `backend/.env`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Where the backend runs |
| `VITE_USE_MOCK` | unset (`false`) | `true` skips the backend and uses the built-in mock: the demo account and generated history, everything marked "Demo data", users kept in `localStorage` |

Restart `npm run dev` after changing either one.

## Things worth trying

- Register a new account: you land on the email verification page. Passwords need 8 or more characters with a letter and a number, and cannot contain spaces or other whitespace.
- Use **Forgot password?** on sign-in to request a reset link. Open the email, enter matching new passwords, and sign in again. Reset links expire after 15 minutes by default and work once.
- After signing in, use browser Back to return to `/login` or `/register`: this ends the dashboard session. Forward to a protected page requires signing in again.
- Open a protected URL such as `/history` while signed out: you are sent to `/login` and returned afterwards.
- Session expiry: tokens last 30 minutes. To see the "Session expired" notice quickly, add `JWT_TTL_MINUTES=1` to `backend/.env`, restart the backend, sign in again and wait a minute. Remove the line afterwards.
- Stop the backend and reload: pages show "Can't reach the Veritas server. Is the backend running?".
- Start over: clear site data for `localhost:5173`. The token lives in `sessionStorage` (`veritas.token`). In mock mode users also live in `localStorage` (`veritas.users`).
- Component gallery: with `npm run dev`, open `/_kit`. It is dev-only and left out of production builds.

## Routes

| Path | Page | Access |
| --- | --- | --- |
| `/login`, `/register` | Sign in, create account | entering either page ends the dashboard session |
| `/forgot-password`, `/reset-password` | Request a reset link, choose a new password | entering either page ends the dashboard session |
| `/` | Overview: greeting, stat tiles, trend, recent analyses | signed in |
| `/diet` | Information Diet: score over time, risk mix, articles vs videos, top terms | signed in |
| `/history` | Analysis History with type, period and search filters | signed in |
| `/history/:id` | Past Analysis Detail: gauges, stance, summary, highlighted text | signed in |

## Folder map (`src/`)

```
main.jsx  App.jsx  routes.jsx    entry, router wiring, route table
styles/        tokens.css (synced copy, do not edit)  base.css (reset + defaults)
components/    shared UI, one folder each: Name/Name.jsx + Name.css; import from the barrel
features/      auth/  overview/  diet/  history/   one folder per area
services/      authApi.js  historyApi.js  session.js  config.js  apiError.js  http/  mock/
hooks/         useAsync.js
lib/           score.js  dates.js  validators.js  text.js  termKinds.js  errors.js
dev/           the /_kit gallery
```

Shared components, props and patterns are listed in [`src/components/README.md`](src/components/README.md). Import them as `import { Card, Gauge } from '../../components'`.

## Services (the seam to the backend)

Pages never call `fetch` or touch storage directly. They call functions in `src/services/`:

- `authApi.js`: `register`, `login`. A thin switch: it uses `http/authHttp.js` (the backend) or `mock/authMock.js` when `VITE_USE_MOCK=true`.
- `historyApi.js`: `listHistory`, `getAnalysis`, `getDiet`. Same switch between `http/historyHttp.js` and `mock/historyMock.js`.
- `http/client.js`: the one `fetch` wrapper. It adds the `Authorization: Bearer` header, turns the backend's `{ code, message }` error body into an `Error` with `.code`, reports a missing server as `NETWORK_ERROR` and a rejected token as `SESSION_EXPIRED`.
- `session.js`: `getSession`, `saveSession`, `clearSession`, `msUntilExpiry`. Keeps the token in `sessionStorage` and drops it once its `exp` has passed.
- `mock/`: the seeded generator (`generator.js`, `mockData.js`) and fake latency, used only in mock mode.
- `lib/errors.js`: one place that turns an error `.code` into the sentence people see.

Both implementations return the same shapes and error codes, so nothing outside `services/` knows which one is active. The data shapes are in [`../docs/CONTRACTS.md`](../docs/CONTRACTS.md) and the endpoints in [`../docs/BACKEND_CONTRACT.md`](../docs/BACKEND_CONTRACT.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Can't reach the Veritas server" | Start the backend and open <http://localhost:8000/health>. If it runs elsewhere, set `VITE_API_URL`. |
| CORS error in the console | Open the dashboard as `http://localhost:5173` (or `127.0.0.1`). The backend allows localhost origins on any port, not LAN addresses or hostnames. |
| Dev server starts on 5174 | Port 5173 is taken. Stop the other process: the extension's "Open dashboard" links point to 5173. |
| Login fails for the demo account | The backend did not seed it (`SEED_DEMO=false`, or the database was created before). Stop the backend, delete `backend/veritas.db`, start it again. |
| Charts empty for a new account | Expected. Analyse pages with the extension while signed in, or use the demo account. |

## Design tokens

`src/styles/tokens.css` is a copy of `../shared/tokens.css`. To change a colour, size or radius, edit the shared file and run `node scripts/sync-tokens.mjs` from the repo root. In component CSS always write `var(--token)`; never hard-code a colour or spacing value that a token covers.

## Code rules

Files stay under about 180 lines, one component or concern per file, one CSS file next to each component. Inputs have labels, focus rings are visible, hit targets are at least 44px, and risk is always shown with a text label as well as colour. The full list is in [`../docs/CONTRACTS.md`](../docs/CONTRACTS.md).
