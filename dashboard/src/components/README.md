# Shared components

Import from the barrel: `import { Card, Gauge, Button } from '../../components';`
Each component lives in `components/Name/Name.jsx` with its own `Name.css`. All colours
and spacing come from `styles/tokens.css` — never hard-code them. Visual QA for everything
below is at `/_kit` (dev server only).

| Component | Props | Example |
| --- | --- | --- |
| `AppShell` | none (layout route) | `<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>` |
| `TopNav` | none; reads `useAuth()` for the email and `logout` | rendered by `AppShell` |
| `PageHeader` | `title`, `subtitle?`, `actions?` (node) | `<PageHeader title="History" actions={<DemoChip />} />` |
| `Card` | `as='section'`, `padding='md'\|'lg'\|'none'`, `interactive`, `className`, `...rest` | `<Card padding="none">{rows}</Card>` |
| `Button` | `variant='primary'\|'secondary'\|'plain'`, `size='md'\|'sm'`, `loading`, `disabled`, `type`, `to`, `icon`, `onClick` | `<Button to="/history" icon="list">See all</Button>` |
| `Gauge` | `value` 0–100, `label`, `size='md'\|'sm'\|'lg'` | `<Gauge value={72} label="Sensationalism" size="lg" />` |
| `RiskBadge` | `level` ('low'\|'medium'\|'high'), `size='md'\|'sm'` | `<RiskBadge level={result.riskLevel} />` |
| `WordCloud` | `terms=[{ term, weight 0..1, kind, count? }]`, `max=40`, `legend=true` | `<WordCloud terms={diet.topTerms} />` |
| `Segmented` | `options=[{ value, label }]`, `value`, `onChange(value)`, `ariaLabel`, `size` | `<Segmented options={PERIODS} value={p} onChange={setP} ariaLabel="Period" />` |
| `SearchField` | `value`, `onChange(value)`, `placeholder`, `ariaLabel` | `<SearchField value={q} onChange={setQ} placeholder="Search" />` |
| `Skeleton` | `width`, `height`, `radius`, `style`, `className` | `<Skeleton width="60%" height={20} />` |
| `EmptyState` | `icon`, `title`, `message`, `action` (node) | `<EmptyState icon="clock" title="No analyses yet" message="…" />` |
| `DemoChip` | none | `<DemoChip />` — put it on every screen that shows scores |
| `Icon` | `name`, `size=20`, `className`, `label?` (makes it non-decorative) | `<Icon name="shield-check" />` |
| `ResultRow` | `result` (AnalysisResult) — the whole row links to `/history/:id` | `<Card padding="none">{list.map(r => <ResultRow key={r.id} result={r} />)}</Card>` |
| `SetupSteps` | none — numbered "install the extension" steps | `<EmptyState action={<SetupSteps />} … />` |
| `Meter` | `value` 0–100, `label?` (makes it a progressbar), `color='var(--accent)'`, `size='md'\|'sm'` | `<Meter value={72} label="Stance confidence" />` |

Icon names: `shield-check article play-video clock chart list search chevron-right chevron-left
chevron-down external-link log-out check alert eye eye-off sparkles trending-up trending-down
close user inbox`.

## Patterns

- **Lists**: stack `ResultRow`s directly inside `<Card padding="none">`; separators and hover
  states are built in.
- **Loading**: render the same layout with `Skeleton`s; keep heights close to the real content.
- **Risk colour**: use `riskVar(level)` from `lib/score.js` (or the `--risk-*` tokens in CSS);
  the badge and gauge already handle it.
- **Focus**: every interactive element gets the token focus ring automatically via `base.css`.
- **Numbers**: add the `tabular` class to any number that sits in a column or animates.

## Hooks, lib, services (foundation)

- `hooks/useAsync(asyncFn, deps)` → `{ data, error, loading, reload }` (stale calls ignored).
- `lib/score.js`: `RISK_THRESHOLDS`, `riskLevelFor`, `riskLabel`, `riskVar`, `clampScore`, `formatScore`.
- `lib/dates.js`: `PERIOD_OPTIONS`, `formatDate`, `formatRelative`, `periodStart`, `previousPeriodRange`,
  `dayKey`, `parseDayKey`, `weekKey`.
- `lib/text.js`: `countLabel(count, singular, plural?)`. `lib/termKinds.js`: `TERM_KINDS`, `kindInfo`,
  `kindLabel`, `isKnownKind` (hyperbole / emotional / clickbait labels).
- `services/historyApi.js`: `listHistory({ type, period, query })`, `getAnalysis(id)`, `getDiet({ period })`.
  All throw `Error` with `.code = 'SESSION_EXPIRED'` when there is no live session; `getAnalysis`
  throws `'NOT_FOUND'`. `getDiet().points` has one bucket per day (7d/30d) or per week (90d/all);
  an empty bucket has `avgScore: null, count: 0`, so filter or `connectNulls` in charts.
- `services/session.js`: `getSession`, `saveSession(token)`, `clearSession`, `msUntilExpiry`.
- `services/mockData.js`: `historyForUser(email)` (demo account only), `sampleResults(n)`.
