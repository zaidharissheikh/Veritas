import { Card, Icon, Meter } from '../../components';
import { countLabel } from '../../lib/text';
import { percentOf } from './dietText';
import './ContentMix.css';

const TYPES = [
  { key: 'article', label: 'Articles', icon: 'article' },
  { key: 'video', label: 'Videos', icon: 'play-video' },
];

export default function ContentMix({ byType }) {
  const counts = TYPES.map((t) => byType[t.key] || 0);
  const total = counts.reduce((sum, n) => sum + n, 0);
  const max = Math.max(1, ...counts);

  return (
    <Card className="diet-content" padding="lg">
      <header className="diet-card__head">
        <h2 className="diet-card__title">Content mix</h2>
        <p className="diet-card__caption">What you analyzed, by type.</p>
      </header>

      <ul className="diet-content__list">
        {TYPES.map((type, i) => (
          <ContentRow key={type.key} type={type} count={counts[i]} pct={percentOf(counts[i], total)} max={max} />
        ))}
      </ul>
    </Card>
  );
}

function ContentRow({ type, count, pct, max }) {
  return (
    <li className="diet-content__row">
      <span className="diet-content__icon" aria-hidden="true">
        <Icon name={type.icon} size={18} />
      </span>
      <div className="diet-content__body">
        <div className="diet-content__line">
          <span className="diet-content__label">{type.label}</span>
          <span className="diet-content__pct tabular">{pct}%</span>
          <span className="diet-content__count tabular">{countLabel(count, 'analysis', 'analyses')}</span>
        </div>
        {/* Decorative: the percentage is printed above. Accent, not risk colour. */}
        <Meter value={(count / max) * 100} className="diet-content__track" />
      </div>
    </li>
  );
}
