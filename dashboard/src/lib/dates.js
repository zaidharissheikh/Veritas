// Date helpers shared by history, diet and overview.

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

/** Time-period choices for segmented controls; values match the service `period` param. */
export const PERIOD_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return dateFormatter.format(d);
}

function plural(n, unit) {
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

export function formatRelative(iso, now = Date.now()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.max(0, now - d.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return plural(days, 'day');
  if (days < 30) return plural(Math.floor(days / 7), 'week');
  if (days < 365) return plural(Math.floor(days / 30), 'month');
  return plural(Math.floor(days / 365), 'year');
}

/** Start of the period (Date) or null for 'all'. */
export function periodStart(period, now = Date.now()) {
  const days = PERIOD_DAYS[period];
  if (!days) return null;
  return new Date(now - days * DAY_MS);
}

/** The window immediately before `period`, for "vs previous" comparisons. */
export function previousPeriodRange(period, now = Date.now()) {
  const days = PERIOD_DAYS[period];
  if (!days) return null;
  const end = new Date(now - days * DAY_MS);
  const start = new Date(now - 2 * days * DAY_MS);
  return { start, end };
}

/** YYYY-MM-DD in local time, used as a bucket key. */
export function dayKey(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Inverse of dayKey: parse "YYYY-MM-DD" as a local date so the day never shifts across timezones. */
export function parseDayKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Monday of the week containing `date`, as a day key. */
export function weekKey(date) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return dayKey(d);
}
