import { useState } from 'react';
import { Card, Icon } from '../../../components';
import { formatScore, riskLevelFor } from '../../../lib/score';
import './VideoCard.css';

// How far the content drifts from the title, worded per risk band.
const BAIT_MEANING = {
  low: 'The title matches what the video delivers.',
  medium: 'The title promises somewhat more than the video delivers.',
  high: 'The title promises something the video largely does not deliver.',
};

// i.ytimg.com answers an unknown video ID with a 120×90 grey placeholder (HTTP 404)
// instead of an error event, so a tiny image counts as "no thumbnail".
const PLACEHOLDER_WIDTH = 120;

function Thumbnail({ url, title }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="video-card__fallback" role="img" aria-label="Thumbnail unavailable">
        <Icon name="play-video" size={28} />
        <span>Thumbnail unavailable</span>
      </div>
    );
  }
  return (
    <img
      className="video-card__img"
      src={url}
      alt={`Thumbnail of ${title}`}
      loading="lazy"
      onLoad={(event) => event.currentTarget.naturalWidth <= PLACEHOLDER_WIDTH && setFailed(true)}
      onError={() => setFailed(true)}
    />
  );
}

// Mock results carry made-up video IDs, so their thumbnails are never requested.
export function VideoCard({ video, title, isMock = false }) {
  if (!video) return null;
  const score = formatScore(video.baitSwitchScore);
  const meaning = BAIT_MEANING[riskLevelFor(video.baitSwitchScore)];

  return (
    <Card className="video-card" aria-labelledby="video-card-title">
      <h2 id="video-card-title" className="video-card__title">Title vs content</h2>
      <div className="video-card__thumb">
        <Thumbnail url={isMock ? null : video.thumbnailUrl} title={title} />
      </div>
      <p className="video-card__score">
        Bait-and-switch <span className="video-card__value">{score}</span>
      </p>
      <p className="video-card__meaning">{meaning}</p>
    </Card>
  );
}
