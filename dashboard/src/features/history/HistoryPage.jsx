import { DemoChip, PageHeader } from '../../components';
import { HistoryFilters } from './HistoryFilters.jsx';
import { HistoryList } from './HistoryList.jsx';
import { useHistoryData } from './useHistoryData.js';
import { useHistoryFilters } from './useHistoryFilters.js';
import './HistoryPage.css';

/** Analysis History (UC-10, FR-5.3/5.4): large title, scope bar, grouped list. */
export default function HistoryPage() {
  const filters = useHistoryFilters();
  const history = useHistoryData(filters);
  const showsDemoData = Boolean(history.results?.some((result) => result.isMock));

  return (
    <div className="history-page">
      <PageHeader
        title="Analysis History"
        subtitle="Every article and video you've analyzed, newest first."
        actions={showsDemoData ? <DemoChip /> : null}
      />

      {history.hasAnyHistory && (
        <HistoryFilters
          type={filters.type}
          period={filters.period}
          search={filters.search}
          onTypeChange={filters.setType}
          onPeriodChange={filters.setPeriod}
          onSearchChange={filters.setSearch}
        />
      )}

      <HistoryList
        results={history.results}
        loading={history.loading}
        error={history.error}
        hasAnyHistory={history.hasAnyHistory}
        isFiltered={filters.isFiltered}
        onRetry={history.reload}
        onClearFilters={filters.clearFilters}
      />
    </div>
  );
}
