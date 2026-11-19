import { PageHeader, TopNav } from '../components';
import { ControlsKit } from './sections/ControlsKit.jsx';
import { DataKit } from './sections/DataKit.jsx';
import { SurfacesKit } from './sections/SurfacesKit.jsx';
import './kit.css';

const SECTIONS = [
  ['buttons', 'Button'],
  ['segmented', 'Segmented'],
  ['search', 'SearchField'],
  ['gauge', 'Gauge'],
  ['risk-badge', 'RiskBadge'],
  ['word-cloud', 'WordCloud'],
  ['result-row', 'ResultRow'],
  ['page-header', 'PageHeader'],
  ['card', 'Card'],
  ['skeleton', 'Skeleton'],
  ['empty-state', 'EmptyState'],
  ['setup-steps', 'SetupSteps'],
  ['demo-chip', 'DemoChip'],
  ['icons', 'Icon'],
];

/** Dev-only visual QA page: every shared component with sample data. */
export default function KitPage() {
  return (
    <div className="kit">
      <TopNav />
      <main className="kit__main">
        <PageHeader
          title="Component kit"
          subtitle="Every shared component with sample data. Dev only — not routed in production."
        />
        <nav className="kit__toc" aria-label="Components">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="kit__toc-link">
              {label}
            </a>
          ))}
        </nav>
        <ControlsKit />
        <DataKit />
        <SurfacesKit />
      </main>
    </div>
  );
}
