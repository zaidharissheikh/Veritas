// Result view: header, dual gauges, overall badge, summary, history note, stance / video,
// XAI word cloud and the extraction disclosure. Sections enter staggered.
import { h } from '../lib/dom.js';
import { wordCloud } from '../components/wordCloud.js';
import { extractionPanel } from '../components/extractionPanel.js';
import { cloudSection, gaugesRow, overallRow, pageHeader, stanceRow, summaryBlock, videoCard } from './resultParts.js';
import { historyNote } from './historyNote.js';

export function renderResult(state, actions) {
  const { result, extraction } = state;
  const parts = [
    section('page', pageHeader(result)),
    section('scores', gaugesRow(result), overallRow(result), summaryBlock(result)),
    historyNote(result, actions),
    section('context', result.contentType === 'video' ? videoCard(result, extraction) : stanceRow(result)),
    section('cloud', cloudSection(wordCloud(termsFrom(result)))),
    section('extraction', extractionPanel(extraction)),
  ];
  return h('div', { className: 'view view--result' }, ...parts.map(stagger));
}

function section(name, ...children) {
  if (children.every((child) => child == null)) return null;
  return h('section', { className: `card card--${name}`, 'aria-label': sectionLabel(name) }, ...children);
}

function stagger(el, index) {
  if (!el) return el;
  el.classList.add('rise');
  el.style.setProperty('--i', String(index));
  return el;
}

function termsFrom(result) {
  return (result.highlights || []).map(({ token, weight, kind }) => ({ term: token, weight, kind }));
}

function sectionLabel(name) {
  return {
    page: 'Page',
    scores: 'Scores',
    context: 'Context',
    cloud: 'Explanation',
    extraction: 'Extracted content',
  }[name];
}
