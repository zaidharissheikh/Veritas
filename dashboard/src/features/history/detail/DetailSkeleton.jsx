import { Card, Skeleton } from '../../../components';
import './DetailSkeleton.css';

// Mirrors the loaded layout so the page does not jump when data arrives.
export function DetailSkeleton() {
  return (
    <div className="detail-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading analysis</span>

      <div className="detail-skeleton__hero">
        <Skeleton width={72} height={20} radius="var(--radius-pill)" />
        <Skeleton width="70%" height={38} />
        <Skeleton width="45%" height={18} />
      </div>

      <Card padding="lg" className="detail-skeleton__scores">
        <div className="detail-skeleton__overall">
          <Skeleton width={120} height={14} />
          <Skeleton width={110} height={56} />
          <Skeleton width={90} height={24} radius="var(--radius-pill)" />
        </div>
        <div className="detail-skeleton__gauges">
          <Skeleton width={176} height={176} radius="50%" />
          <Skeleton width={176} height={176} radius="50%" />
        </div>
      </Card>

      <div className="detail-skeleton__grid">
        <Card><Skeleton width="100%" height={120} /></Card>
        <Card><Skeleton width="100%" height={120} /></Card>
      </div>

      <Card padding="lg"><Skeleton width="100%" height={220} /></Card>
    </div>
  );
}
