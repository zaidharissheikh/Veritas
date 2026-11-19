import { Card, Skeleton } from '../../components';
import './DietSkeleton.css';

// Mirrors the real grid so the page does not jump when data arrives.
export default function DietSkeleton() {
  return (
    <div className="diet-grid diet-skeleton" aria-busy="true" aria-label="Loading your Information Diet">
      <Card className="diet-hero" padding="lg">
        <Skeleton width={150} height={150} radius="50%" />
        <Skeleton width="70%" height={22} />
        <Skeleton width="45%" height={16} />
        <Skeleton width="55%" height={14} />
      </Card>

      <Card className="diet-trend" padding="lg">
        <CardHead />
        <Skeleton width="100%" height={260} radius="var(--radius-md)" />
      </Card>

      <Card className="diet-mix" padding="lg">
        <CardHead />
        <Skeleton width="100%" height={14} radius="var(--radius-pill)" />
        <Rows count={3} />
      </Card>

      <Card className="diet-content" padding="lg">
        <CardHead />
        <Rows count={2} />
      </Card>

      <Card className="diet-terms" padding="lg">
        <CardHead />
        <Skeleton width="100%" height={160} radius="var(--radius-md)" />
      </Card>
    </div>
  );
}

function CardHead() {
  return (
    <div className="diet-skeleton__head">
      <Skeleton width="40%" height={18} />
      <Skeleton width="65%" height={13} />
    </div>
  );
}

function Rows({ count }) {
  return (
    <div className="diet-skeleton__rows">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width="100%" height={16} />
      ))}
    </div>
  );
}
