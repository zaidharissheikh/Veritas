import { SearchField, Segmented } from '../../components';
import { PERIOD_OPTIONS, TYPE_OPTIONS } from './filterOptions.js';
import './HistoryFilters.css';

/** Content type + period scope bar with an inline search field (FR-5.4). */
export function HistoryFilters({
  type,
  period,
  search,
  onTypeChange,
  onPeriodChange,
  onSearchChange,
}) {
  return (
    <div className="history-filters" role="group" aria-label="Filter history">
      <div className="history-filters__segments">
        <Segmented
          options={TYPE_OPTIONS}
          value={type}
          onChange={onTypeChange}
          ariaLabel="Content type"
        />
        <Segmented
          options={PERIOD_OPTIONS}
          value={period}
          onChange={onPeriodChange}
          ariaLabel="Time period"
        />
      </div>
      <div className="history-filters__search">
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder="Search by title or source"
          ariaLabel="Search history by title or source"
        />
      </div>
    </div>
  );
}
