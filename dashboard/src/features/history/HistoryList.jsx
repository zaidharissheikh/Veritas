import { useRef } from 'react';
import { Card, ResultRow } from '../../components';
import { countLabel } from '../../lib/text.js';
import { HistorySkeleton } from './HistorySkeleton.jsx';
import { HistoryError, HistoryNoContent, HistoryNoMatches } from './HistoryStates.jsx';
import './HistoryList.css';

// Rows past this index all share the last stagger delay so long lists don't crawl.
const STAGGER_LIMIT = 10;

/**
 * Grouped inset list of analyses, newest first. `results` is null until the
 * first load finishes; during refetches the previous rows stay visible, dimmed.
 */
export function HistoryList({
  results,
  loading,
  error,
  hasAnyHistory,
  isFiltered,
  onRetry,
  onClearFilters,
}) {
  // Only the very first set of rows fades in; later fetches just swap content.
  const firstResults = useRef(null);

  if (error) return <HistoryError error={error} onRetry={onRetry} />;
  if (results === null) return <HistorySkeleton />;

  if (results.length === 0) {
    if (loading) return <HistorySkeleton />;
    if (!hasAnyHistory) return <HistoryNoContent />;
    return <HistoryNoMatches onClear={isFiltered ? onClearFilters : null} />;
  }

  if (firstResults.current === null) firstResults.current = results;
  const entering = firstResults.current === results;

  return (
    <section className="history-list" aria-busy={loading} aria-label="Analyses">
      <p className="history-list__count" aria-live="polite">
        {countLabel(results.length, 'analysis', 'analyses')}
      </p>
      <Card
        padding="none"
        className={`history-list__card${loading ? ' history-list__card--busy' : ''}`}
      >
        <ul className={`history-list__rows${entering ? ' history-list__rows--enter' : ''}`}>
          {results.map((result, index) => (
            <li
              key={result.id}
              className="history-list__row"
              style={{ '--row-index': Math.min(index, STAGGER_LIMIT) }}
            >
              <ResultRow result={result} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
