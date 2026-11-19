// Filter vocabulary for the Analysis History list (UC-10, FR-5.4).
// Values double as URL query-string values, so keep them short and stable.
import { PERIOD_OPTIONS } from '../../lib/dates.js';

export { PERIOD_OPTIONS };

export const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'article', label: 'Articles' },
  { value: 'video', label: 'Videos' },
];

// Keys match the query-string names (?type=&period=&q=).
export const DEFAULT_FILTERS = { type: 'all', period: 'all', q: '' };

function pickKnown(options, value, fallback) {
  return options.some((option) => option.value === value) ? value : fallback;
}

export function normalizeType(value) {
  return pickKnown(TYPE_OPTIONS, value, DEFAULT_FILTERS.type);
}

export function normalizePeriod(value) {
  return pickKnown(PERIOD_OPTIONS, value, DEFAULT_FILTERS.period);
}
