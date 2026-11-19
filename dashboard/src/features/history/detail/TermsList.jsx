import { Meter } from '../../../components';
import { kindClass, kindInfo, weightPercent } from './highlights';
import './TermsList.css';

function TermRow({ term }) {
  const pct = weightPercent(term.weight);
  const { label } = kindInfo(term.kind);
  return (
    <li className={`terms__row ${kindClass(term.kind)}`}>
      <div className="terms__head">
        <span className="terms__term">{term.term}</span>
        <span className="terms__kind">{label}</span>
        <span className="terms__pct">{pct}%</span>
      </div>
      {/* --hl-color comes from the kind class on the row. */}
      <Meter value={pct} label={`${term.term} weight`} color="var(--hl-color)" size="sm" className="terms__bar" />
    </li>
  );
}

export function TermsList({ terms }) {
  if (!terms?.length) return null;
  return (
    <div className="terms">
      <h3 className="terms__title">Strongest terms</h3>
      <ol className="terms__list">
        {terms.map((term) => (
          <TermRow key={term.term.toLowerCase()} term={term} />
        ))}
      </ol>
    </div>
  );
}
