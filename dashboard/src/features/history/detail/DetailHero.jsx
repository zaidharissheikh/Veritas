import { useNavigate } from 'react-router-dom';
import { Button, DemoChip, Icon } from '../../../components';
import { formatDate } from '../../../lib/dates';
import './DetailHero.css';

// react-router v6 stores a history index; > 0 means we arrived from inside
// the app, so going back preserves the list's filters (UC-11 step 5).
function cameFromInsideApp() {
  return Number(window.history.state?.idx) > 0;
}

const TYPE_META = {
  article: { icon: 'article', label: 'Article' },
  video: { icon: 'play-video', label: 'Video' },
};

export function DetailHero({ result }) {
  const navigate = useNavigate();
  const type = TYPE_META[result.contentType] || TYPE_META.article;

  function goBack() {
    if (cameFromInsideApp()) navigate(-1);
    else navigate('/history');
  }

  return (
    <header className="detail-hero">
      <div className="detail-hero__nav">
        <Button variant="plain" size="sm" icon="chevron-left" onClick={goBack}>
          History
        </Button>
      </div>

      <div className="detail-hero__chips">
        <span className="detail-hero__type">
          <Icon name={type.icon} size={14} />
          {type.label}
        </span>
        {result.isMock && <DemoChip />}
      </div>

      <h1 className="detail-hero__title">{result.title}</h1>

      <p className="detail-hero__meta">
        <span className="detail-hero__source">{result.source}</span>
        <span className="detail-hero__dot" aria-hidden="true">·</span>
        <span>
          Analyzed <time dateTime={result.analyzedAt}>{formatDate(result.analyzedAt)}</time>
        </span>
        {result.url && (
          <a
            className="detail-hero__link"
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original
            <Icon name="external-link" size={14} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </p>
    </header>
  );
}
