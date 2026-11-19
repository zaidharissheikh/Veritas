import { Navigate, useParams } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { getAnalysis } from '../../services/historyApi';
import { DetailHero } from './detail/DetailHero';
import { ScoreHero } from './detail/ScoreHero';
import { StanceCard } from './detail/StanceCard';
import { VideoCard } from './detail/VideoCard';
import { SummaryCard } from './detail/SummaryCard';
import { WhyCard } from './detail/WhyCard';
import { DetailSkeleton } from './detail/DetailSkeleton';
import { DetailError } from './detail/DetailError';
import './DetailPage.css';

// Past Analysis Detail (UC-11). useAsync re-runs on id change and drops stale
// responses, so a fast back/forward between entries never shows the wrong one.
export default function DetailPage() {
  const { id } = useParams();
  const { data: result, error, loading, reload } = useAsync(() => getAnalysis(id), [id]);

  if (loading) return <DetailSkeleton />;
  if (error?.code === 'SESSION_EXPIRED') return <Navigate to="/login?expired=1" replace />;
  if (error) return <DetailError error={error} onRetry={reload} />;
  if (!result) return null;

  const isVideo = result.contentType === 'video';

  return (
    <article className="detail" key={result.id}>
      <DetailHero result={result} />
      <ScoreHero result={result} />
      <div className="detail__grid">
        {isVideo ? (
          <VideoCard video={result.video} title={result.title} isMock={result.isMock} />
        ) : (
          <StanceCard article={result.article} />
        )}
        <SummaryCard summary={result.summary} />
      </div>
      <WhyCard excerpt={result.excerpt} highlights={result.highlights} />
    </article>
  );
}
