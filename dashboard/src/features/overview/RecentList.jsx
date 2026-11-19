import { Link } from 'react-router-dom';
import { Card, Icon, ResultRow } from '../../components';
import './RecentList.css';

/** The newest analyses as an inset grouped list, with a link to the full history. */
export function RecentList({ results, className = '', ...rest }) {
  return (
    <section className={`recent ${className}`.trim()} aria-labelledby="recent-title" {...rest}>
      <div className="recent__head">
        <h2 id="recent-title" className="recent__title">
          Recent analyses
        </h2>
        <Link to="/history" className="recent__link">
          See all history
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>

      <Card as="div" padding="none" className="recent__group">
        <ul className="recent__rows">
          {results.map((result) => (
            <li key={result.id} className="recent__row">
              <ResultRow result={result} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
