// Sections of the result view, one function each.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { gauge } from '../components/gauge.js';
import { riskBadge } from '../components/riskBadge.js';
import { siteChip, typeChip } from '../components/chips.js';

export function pageHeader(result) {
  return h(
    'div',
    { className: 'page-head' },
    h('div', { className: 'page-head__chips' }, typeChip(result.contentType), siteChip(result.source)),
    h('h1', { className: 'page-head__title', title: result.title }, result.title),
  );
}

export function gaugesRow(result) {
  return h('div', { className: 'gauges' }, ...result.gauges.slice(0, 2).map((g) => gauge({ value: g.value, label: g.label })));
}

export function overallRow(result) {
  return h(
    'div',
    { className: 'overall' },
    h('div', { className: 'overall__text' }, h('span', { className: 'overall__label' }, 'Overall'), h('span', { className: 'overall__score' }, `${Math.round(result.riskScore)} / 100`)),
    riskBadge(result.riskLevel),
  );
}

export function summaryBlock(result) {
  return h('p', { className: 'summary' }, result.summary);
}

export function stanceRow(result) {
  const { stanceLabel, stanceConfidence } = result.article || {};
  if (!stanceLabel) return null;
  const pct = Math.round((stanceConfidence || 0) * 100);
  return h(
    'div',
    { className: 'row' },
    h('div', { className: 'row__lead' }, icon('quote', { size: 18 })),
    h('div', { className: 'row__text' }, h('span', { className: 'row__label' }, 'Body stance toward headline'), h('span', { className: 'row__hint' }, `${pct}% confidence`)),
    h('span', { className: 'row__value' }, stanceLabel),
  );
}

export function videoCard(result, extraction) {
  const video = result.video;
  if (!video) return null;
  const channel = (extraction && extraction.video && extraction.video.channel) || '';
  // The play glyph sits behind the thumbnail, so a blocked or missing image still looks intentional.
  const image = h('img', { className: 'video__thumb', src: video.thumbnailUrl, alt: '', onerror: () => image.remove() });
  return h(
    'div',
    { className: 'video' },
    h('div', { className: 'video__frame', 'aria-hidden': 'true' }, h('span', { className: 'video__placeholder' }, icon('play', { size: 28 })), image),
    h(
      'div',
      { className: 'video__meta' },
      h('span', { className: 'row__label' }, channel || 'YouTube video'),
      h('span', { className: 'row__hint' }, channel ? 'YouTube channel' : `Video ${video.videoId}`),
    ),
  );
}

export function cloudSection(cloud) {
  return h(
    'div',
    { className: 'cloud-section' },
    h('div', { className: 'section__head' }, h('h2', { className: 'section__title' }, 'What influenced the score'), h('span', { className: 'section__hint' }, 'Bigger = more weight')),
    cloud,
  );
}
