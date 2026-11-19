// Collapsible "Extracted content" disclosure so we can see extraction working.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { button } from './button.js';

const PREVIEW_CHARS = 400;
const COPIED_MS = 1600;

export function extractionPanel(extraction) {
  const rows = extraction.pageType === 'video' ? videoRows(extraction.video || {}) : articleRows(extraction.article || {});
  const preview = extraction.pageType === 'video' ? '' : previewOf(extraction.article && extraction.article.body);

  return h(
    'details',
    { className: 'xpanel' },
    h(
      'summary',
      { className: 'xpanel__summary' },
      icon('chevron', { size: 16, className: 'xpanel__chevron' }),
      h('span', { className: 'xpanel__title' }, 'Extracted content'),
      h('span', { className: 'xpanel__meta' }, metaOf(extraction)),
    ),
    h(
      'div',
      { className: 'xpanel__body' },
      h('dl', { className: 'xpanel__rows' }, ...rows.flatMap(row)),
      preview ? h('p', { className: 'xpanel__preview' }, preview) : null,
      h('div', { className: 'xpanel__actions' }, copyButton(extraction)),
    ),
  );
}

function row([term, value]) {
  return [h('dt', { className: 'xpanel__term' }, term), h('dd', { className: 'xpanel__value' }, value || '—')];
}

function articleRows(article) {
  return [
    ['Headline', article.headline],
    ['Byline', article.byline],
    ['Site', article.siteName],
    ['Words', article.wordCount != null ? String(article.wordCount) : ''],
    ['Language', article.lang],
    ['Published', article.publishedTime],
  ];
}

function videoRows(video) {
  return [
    ['Title', video.title],
    ['Channel', video.channel],
    ['Video ID', video.videoId],
    ['Thumbnail', video.thumbnailUrl],
  ];
}

function metaOf(extraction) {
  if (extraction.pageType === 'video') return 'YouTube';
  const count = extraction.article && extraction.article.wordCount;
  return count ? `${count} words` : 'Article';
}

function previewOf(body) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS).trimEnd()}…` : text;
}

function copyButton(extraction) {
  const btn = button('Copy JSON', { variant: 'secondary', iconName: 'copy', onClick: copy });
  const label = btn.querySelector('.btn__label');
  btn.setAttribute('aria-live', 'polite');

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(extraction, null, 2));
      flash('Copied');
    } catch {
      flash('Copy failed');
    }
  }

  function flash(text) {
    label.textContent = text;
    setTimeout(() => { label.textContent = 'Copy JSON'; }, COPIED_MS);
  }

  return btn;
}
