import { createRng, hexId, pick, randFloat, randInt, randomId, shuffle } from './prng.js';
import { ARTICLES, ARTICLE_SOURCES } from './articles.js';
import { VIDEOS, VIDEO_CHANNELS } from './videos.js';
import { kindOf } from './terms.js';
import { stanceFor, summaryFor } from './summaries.js';
import { clampScore, riskLevelFor } from '../../lib/score.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SPAN_DAYS = 120;
const MAX_HIGHLIGHTS = 8;

const GAUGES = {
  article: [
    { key: 'sensationalism', label: 'Sensationalism' },
    { key: 'mismatch', label: 'Headline mismatch' },
  ],
  video: [
    { key: 'baitSwitch', label: 'Bait-and-switch' },
    { key: 'titleHype', label: 'Title hype' },
  ],
};

const WEIGHT_RANGE = { low: [0.2, 0.5], medium: [0.45, 0.8], high: [0.7, 0.98] };

function sourceBucket(tone) {
  if (tone < 0.35) return 'calm';
  if (tone < 0.65) return 'mixed';
  return 'loud';
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Recent weeks skew lower: the user's "diet" is slowly improving. */
function trendAdjustment(daysAgo) {
  return -Math.max(0, 35 - daysAgo) * 0.35;
}

/** A real model never returns exactly 0, so keep a small floor. */
function riskScoreFor(tone, daysAgo, rng) {
  return Math.round(Math.max(4, clampScore(tone * 100 + randFloat(rng, -8, 8) + trendAdjustment(daysAgo))));
}

function analyzedAtFor(rng, daysAgo, now) {
  const date = new Date(now - daysAgo * DAY_MS);
  date.setHours(randInt(rng, 7, 22), randInt(rng, 0, 59), randInt(rng, 0, 59), 0);
  // A time later today has not happened yet: mirror it into the past (no extra rng draws,
  // so the rest of the data set stays the same).
  const t = date.getTime();
  return new Date(t > now ? now - (t - now) : t).toISOString();
}

/** Highlights point at real tokens in the excerpt, so tokenIndex always resolves. */
function highlightsFor(excerpt, level, rng) {
  const [min, max] = WEIGHT_RANGE[level];
  return excerpt
    .split(/\s+/)
    .map((token, tokenIndex) => ({ token, tokenIndex, kind: kindOf(token) }))
    .filter((h) => h.kind)
    .slice(0, MAX_HIGHLIGHTS)
    .map((h) => ({ ...h, weight: Number(randFloat(rng, min, max).toFixed(2)) }));
}

function gaugesFor(contentType, riskScore, rng) {
  return GAUGES[contentType].map((g, i) => ({
    ...g,
    value: Math.round(clampScore(riskScore + randFloat(rng, -10, 10) * (i === 0 ? 1 : -1))),
  }));
}

/** Fields every AnalysisResult shares; the type-specific builders add url/source and their block. */
function buildBase(entry, { contentType, url, source }, rng, daysAgo, now) {
  const riskScore = riskScoreFor(entry.tone, daysAgo, rng);
  const riskLevel = riskLevelFor(riskScore);
  const excerpt = `${entry.title}. ${entry.body}`;
  const gauges = gaugesFor(contentType, riskScore, rng);
  return {
    id: hexId(rng, 'res_'),
    contentType,
    url,
    title: entry.title,
    source,
    analyzedAt: analyzedAtFor(rng, daysAgo, now),
    riskScore,
    riskLevel,
    gauges,
    summary: summaryFor(contentType, riskLevel, rng),
    excerpt,
    highlights: highlightsFor(excerpt, riskLevel, rng),
    isMock: true,
  };
}

function buildArticle(entry, rng, daysAgo, now) {
  const source = pick(rng, ARTICLE_SOURCES[sourceBucket(entry.tone)]);
  const url = `https://${source}/${slugify(entry.title)}`;
  const base = buildBase(entry, { contentType: 'article', url, source }, rng, daysAgo, now);
  const article = {
    stanceLabel: stanceFor(base.riskLevel, rng),
    stanceConfidence: Number(randFloat(rng, 0.55, 0.97).toFixed(2)),
    sensationalismScore: base.gauges[0].value,
  };
  return { ...base, article };
}

function buildVideo(entry, rng, daysAgo, now) {
  const channel = pick(rng, VIDEO_CHANNELS[sourceBucket(entry.tone)]);
  const videoId = randomId(rng, 11);
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const base = buildBase(entry, { contentType: 'video', url, source: `youtube.com · ${channel}` }, rng, daysAgo, now);
  const video = {
    videoId,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    baitSwitchScore: base.gauges[0].value,
  };
  return { ...base, video };
}

/**
 * ~60 AnalysisResults over the last 120 days, newest first. Same seed and
 * same day → same data, so the UI is stable between reloads.
 */
export function generateHistory({ seed = 20260401, now = Date.now() } = {}) {
  const rng = createRng(seed);
  const entries = shuffle(rng, [
    ...ARTICLES.map((e) => ({ ...e, contentType: 'article' })),
    ...VIDEOS.map((e) => ({ ...e, contentType: 'video' })),
  ]);

  return entries
    .map((entry) => {
      // Skew toward recent days so charts have more points where it matters.
      const daysAgo = Math.floor(Math.pow(rng(), 1.5) * SPAN_DAYS);
      const build = entry.contentType === 'video' ? buildVideo : buildArticle;
      return build(entry, rng, daysAgo, now);
    })
    .sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));
}
