import { Card, Skeleton } from '../../components';
import './HistoryList.css';

const ROW_COUNT = 6;

function SkeletonRow() {
  return (
    <li className="history-list__row history-skeleton__row">
      <Skeleton width={40} height={40} radius="var(--radius-md)" />
      <span className="history-skeleton__text">
        <Skeleton width="56%" height={15} />
        <Skeleton width="32%" height={12} />
      </span>
      <span className="history-skeleton__scores">
        <Skeleton width={64} height={30} />
        <Skeleton width={64} height={30} />
      </span>
      <Skeleton width={76} height={22} radius="var(--radius-pill)" />
    </li>
  );
}

/** Placeholder rows shaped like ResultRow, shown while the list loads. */
export function HistorySkeleton() {
  return (
    <div className="history-list" aria-busy="true">
      <span className="sr-only">Loading your history</span>
      <Skeleton width={96} height={14} className="history-list__count-skeleton" />
      <Card padding="none" className="history-list__card">
        <ul className="history-list__rows">
          {Array.from({ length: ROW_COUNT }, (_, index) => (
            <SkeletonRow key={index} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
