// Mock analysis service, used ONLY by the design preview (popup opened as a plain page).
// The live extension talks to the backend through analysis.service.js.
// analyze(extraction) resolves to an AnalysisResult (CONTRACTS §5) after ~900 ms.
// Scores are deterministic from the extracted text so repeated opens match.
import { hashText, headlineBodyMismatch, hypeScore, textFeatures, unitFromHash, clamp01to100 } from '../lib/heuristics.js';
import { excerptOf, highlightsFor, stanceFor, summaryFor, topTerms } from '../lib/narrative.js';
import { riskLevelFor } from '../lib/score.js';
import { wait } from '../lib/motion.js';
import { getSession } from './auth.js';
import { previewParam } from './preview.js';

const LATENCY_MS = 900;

// Preview scenarios that fail the way the backend would (same `code` / `view` as analysis.service).
const PREVIEW_ERRORS = {
  error: { code: 'NETWORK_ERROR', view: 'error', message: "Can't reach the Veritas server — is the backend running?" },
  noCaptions: { code: 'NO_CAPTIONS', view: 'failure', message: "This video has no captions, so Veritas can't check it" },
};

export async function analyze(extraction) {
  await wait(Number(previewParam('latency')) || LATENCY_MS);
  const failure = PREVIEW_ERRORS[previewParam('scenario')];
  if (failure) throw Object.assign(new Error(failure.message), { code: failure.code, view: failure.view });
  const result = extraction.pageType === 'video' ? videoResult(extraction) : articleResult(extraction);
  // Mirrors the backend: a result is saved to the history only when signed in.
  return { ...result, saved: Boolean(await getSession()) };
}

function articleResult(extraction) {
  const { headline = '', body = '' } = extraction.article || {};
  const hash = hashText(`${headline}\n${body}`);
  const headFeatures = textFeatures(headline);
  const bodyFeatures = textFeatures(body);
  const sensationalism = clamp01to100(
    0.5 * hypeScore(headFeatures, { headline: true }) + 0.5 * hypeScore(bodyFeatures) + jitter(hash, 'sens', 6),
  );
  const mismatch = clamp01to100(headlineBodyMismatch(headline, body) + jitter(hash, 'mis', 8));
  const riskScore = clamp01to100(0.55 * sensationalism + 0.45 * mismatch);
  const excerpt = excerptOf(headline, body);
  const terms = topTerms([...headFeatures.hits, ...bodyFeatures.hits]);

  return {
    ...baseResult(extraction, hash, headline, riskScore),
    contentType: 'article',
    gauges: [
      { key: 'sensationalism', label: 'Sensationalism', value: sensationalism },
      { key: 'mismatch', label: 'Headline mismatch', value: mismatch },
    ],
    summary: summaryFor({ contentType: 'article', hype: sensationalism, secondary: mismatch, terms }),
    excerpt,
    highlights: highlightsFor(excerpt),
    article: { ...stanceFor(hash, mismatch), sensationalismScore: sensationalism },
  };
}

function videoResult(extraction) {
  const { videoId = '', title = '', channel = '', thumbnailUrl = '' } = extraction.video || {};
  const hash = hashText(`${videoId}\n${title}\n${channel}`);
  const titleFeatures = textFeatures(title);
  const titleHype = clamp01to100(hypeScore(titleFeatures, { headline: true }) + jitter(hash, 'hype', 6));
  // No transcript yet, so bait-and-switch is inferred from the title shape alone.
  const hookBonus = (/\?/.test(title) ? 10 : 0) + (/\b\d+\b/.test(title) ? 8 : 0) + (/\byou\b/i.test(title) ? 6 : 0);
  const baitSwitch = clamp01to100(0.6 * titleHype + hookBonus + unitFromHash(hash, 'bait') * 22);
  const riskScore = clamp01to100(0.5 * baitSwitch + 0.5 * titleHype);
  const excerpt = excerptOf(title, '');

  return {
    ...baseResult(extraction, hash, title, riskScore),
    contentType: 'video',
    gauges: [
      { key: 'baitSwitch', label: 'Bait-and-switch', value: baitSwitch },
      { key: 'titleHype', label: 'Title hype', value: titleHype },
    ],
    summary: summaryFor({ contentType: 'video', hype: titleHype, secondary: baitSwitch, terms: topTerms(titleFeatures.hits) }),
    excerpt,
    highlights: highlightsFor(excerpt),
    video: { videoId, thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, baitSwitchScore: baitSwitch },
  };
}

function baseResult(extraction, hash, title, riskScore) {
  return {
    id: `res_${hash.toString(16).padStart(8, '0')}`,
    url: extraction.url || '',
    title: title || 'Untitled',
    source: hostnameOf(extraction.url),
    analyzedAt: new Date().toISOString(),
    riskScore,
    riskLevel: riskLevelFor(riskScore),
    isMock: true,
  };
}

function jitter(hash, salt, span) {
  return Math.round((unitFromHash(hash, salt) - 0.5) * 2 * span);
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
