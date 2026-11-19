// Small neutral chips for the page header: content type and site.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

export function typeChip(pageType) {
  const isVideo = pageType === 'video';
  return h(
    'span',
    { className: 'chip chip--type' },
    icon(isVideo ? 'play' : 'article', { size: 14 }),
    isVideo ? 'Video' : 'Article',
  );
}

export function siteChip(host) {
  if (!host) return null;
  return h('span', { className: 'chip chip--site', title: host }, host);
}
