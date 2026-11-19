import { Button, Card, DemoChip, EmptyState, Icon, PageHeader, SetupSteps, Skeleton } from '../../components';
import { ICON_NAMES } from '../../components/Icon/paths.js';
import { KitRow, KitSection } from '../KitSection.jsx';

export function SurfacesKit() {
  return (
    <>
      <KitSection id="page-header" title="PageHeader" note="Apple large title with subtitle and trailing actions.">
        <Card padding="none" style={{ paddingInline: 'var(--space-5)' }}>
          <PageHeader
            title="Information Diet"
            subtitle="How manipulative the content you consumed was, over time."
            actions={<DemoChip />}
          />
        </Card>
      </KitSection>

      <KitSection id="card" title="Card" note="padding md | lg | none; interactive adds hover lift.">
        <KitRow>
          <Card className="kit-card">
            <strong>Default</strong>
            <p className="kit-muted">padding="md"</p>
          </Card>
          <Card padding="lg" className="kit-card">
            <strong>Large</strong>
            <p className="kit-muted">padding="lg"</p>
          </Card>
          <Card as="a" href="#card" interactive className="kit-card">
            <strong>Interactive</strong>
            <p className="kit-muted">hover me</p>
          </Card>
        </KitRow>
      </KitSection>

      <KitSection id="skeleton" title="Skeleton" note="Shimmer pauses under prefers-reduced-motion.">
        <Card className="kit-skeleton">
          <Skeleton width="60%" height={22} />
          <Skeleton height={14} />
          <Skeleton width="80%" height={14} />
          <div className="kit-skeleton__row">
            <Skeleton width={40} height={40} radius="var(--radius-md)" />
            <Skeleton width={120} height={40} radius="var(--radius-pill)" />
          </div>
        </Card>
      </KitSection>

      <KitSection id="empty-state" title="EmptyState">
        <Card>
          <EmptyState
            icon="clock"
            title="No analyses yet"
            message="Open the Veritas extension on an article or YouTube video and the result will appear here."
            action={<Button variant="secondary">Learn how</Button>}
          />
        </Card>
      </KitSection>

      <KitSection id="setup-steps" title="SetupSteps" note="First-run guidance inside empty states.">
        <Card>
          <SetupSteps />
        </Card>
      </KitSection>

      <KitSection id="demo-chip" title="DemoChip" note="Hover or focus for the tooltip.">
        <KitRow>
          <DemoChip />
        </KitRow>
      </KitSection>

      <KitSection id="icons" title="Icon" note="1.5px stroke, 24-unit grid.">
        <ul className="kit-icons">
          {ICON_NAMES.map((name) => (
            <li key={name} className="kit-icons__item">
              <Icon name={name} size={22} />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </KitSection>
    </>
  );
}
