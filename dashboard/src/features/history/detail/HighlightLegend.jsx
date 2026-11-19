import { TERM_KINDS, kindClass } from './highlights';
import './HighlightLegend.css';

export function HighlightLegend() {
  return (
    <dl className="hl-legend" aria-label="Highlight kinds">
      {TERM_KINDS.map(({ kind, label, description }) => (
        <div key={kind} className={`hl-legend__item ${kindClass(kind)}`}>
          <dt className="hl-legend__term">
            <span className="hl-legend__swatch" aria-hidden="true" />
            {label}
          </dt>
          <dd className="hl-legend__desc">{description}</dd>
        </div>
      ))}
    </dl>
  );
}
