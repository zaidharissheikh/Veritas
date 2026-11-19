// Skeleton that mirrors the result layout, plus the named steps of the analysis.
// Steps move from upcoming → active → done in place, so nothing flashes on each tick.
import { h, replaceChildren } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

// The steps come first so they stay above the fold of the 580px popup.
export function renderLoading(state) {
  return h(
    'div',
    { className: 'view view--loading', 'aria-busy': 'true' },
    h('section', { className: 'card card--progress', 'aria-label': 'Progress' }, h('div', { className: 'progress' }, stepList(state), noteLine(state))),
    skeletonCard(),
    h('p', { className: 'sr-only', role: 'status', 'aria-live': 'polite' }, state.status),
  );
}

// Same view, new status: update the steps without rebuilding the skeleton.
export function updateLoading(view, state) {
  const progress = view.querySelector('.progress');
  const items = progress ? [...progress.querySelectorAll('.step')] : [];
  if (!progress) return;
  if (items.length !== (state.steps || []).length) {
    replaceChildren(progress, stepList(state), noteLine(state));
  } else {
    const active = activeIndex(state);
    items.forEach((item, index) => setPhase(item, phaseOf(index, active)));
    const note = progress.querySelector('.progress__note');
    if (!note && state.note) progress.appendChild(noteLine(state));
  }
  const live = view.querySelector('.sr-only');
  if (live) live.textContent = state.status;
}

function stepList(state) {
  const steps = state.steps || [state.status];
  const active = activeIndex(state);
  return h('ol', { className: 'steps' }, ...steps.map((label, index) => stepItem(label, phaseOf(index, active))));
}

function stepItem(label, phase) {
  const item = h(
    'li',
    { className: 'step' },
    h('span', { className: 'step__mark', 'aria-hidden': 'true' }, icon('check', { size: 12 })),
    h('span', { className: 'step__label' }, label),
  );
  return setPhase(item, phase);
}

function setPhase(item, phase) {
  item.className = `step step--${phase}`;
  if (phase === 'active') item.setAttribute('aria-current', 'step');
  else item.removeAttribute('aria-current');
  return item;
}

function activeIndex(state) {
  return Math.max(0, (state.steps || []).indexOf(state.status));
}

function phaseOf(index, active) {
  if (index < active) return 'done';
  return index === active ? 'active' : 'next';
}

function noteLine(state) {
  return state.note ? h('p', { className: 'progress__note' }, state.note) : null;
}

function skeletonCard() {
  return h(
    'div',
    { className: 'skeleton', 'aria-hidden': 'true' },
    h('div', { className: 'skel-row' }, block('skel skel--chip'), block('skel skel--chip skel--wide')),
    block('skel skel--title'),
    block('skel skel--title skel--short'),
    h('div', { className: 'skel-gauges' }, gaugeSkeleton(), gaugeSkeleton()),
    block('skel skel--badge'),
    block('skel skel--line'),
    block('skel skel--line'),
    block('skel skel--line skel--short'),
    h('div', { className: 'skel-cloud' }, ...[64, 40, 88, 52, 72, 44].map((w) => block('skel skel--term', { width: `${w}px` }))),
  );
}

function block(className, style) {
  return h('div', { className, style });
}

function gaugeSkeleton() {
  return h('div', { className: 'skel-gauge' }, block('skel skel--dial'), block('skel skel--label'));
}
