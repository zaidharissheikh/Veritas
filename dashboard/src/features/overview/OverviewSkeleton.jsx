import { Card, Skeleton } from '../../components';

const RECENT_ROWS = [0, 1, 2, 3];

function TileSkeleton() {
  return (
    <Card className="stat-tile">
      <Skeleton width="42%" height={14} radius={6} />
      <Skeleton width="56%" height={34} radius={8} />
      <Skeleton width="72%" height={12} radius={6} />
    </Card>
  );
}

function RowSkeleton() {
  return (
    <div className="overview__row-skeleton">
      <Skeleton width={40} height={40} radius={10} />
      <div className="overview__row-skeleton-text">
        <Skeleton width="62%" height={14} radius={6} />
        <Skeleton width="34%" height={12} radius={6} />
      </div>
    </div>
  );
}

/** Placeholder layout shown while the diet + history requests are in flight. */
export function OverviewSkeleton() {
  return (
    <div className="overview" aria-busy="true" aria-label="Loading your overview">
      <div className="overview__tiles">
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
      </div>

      <Card className="trend-card">
        <Skeleton width="28%" height={16} radius={6} />
        <Skeleton width="100%" height={96} radius={12} />
      </Card>

      <div className="recent">
        <Skeleton width="36%" height={20} radius={6} />
        <Card as="div" padding="none" className="recent__group">
          {RECENT_ROWS.map((i) => (
            <RowSkeleton key={i} />
          ))}
        </Card>
      </div>
    </div>
  );
}
