// 270° arc gauge. Same language as the dashboard Gauge: big tabular number,
// risk word under it, label below, colour by risk level, spring-in animation.
import { h, svg } from '../lib/dom.js';
import { springTo } from '../lib/motion.js';
import { clampScore, formatScore, riskLabel, riskLevelFor, riskWord } from '../lib/score.js';

const SIZE = 120;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const VIEW_HEIGHT = 106; // the arc is open at the bottom, so trim the empty strip

export function gauge({ value, label }) {
  const score = clampScore(value);
  const level = riskLevelFor(score);
  const number = h('span', { className: 'gauge__number' }, '0');
  const valueArc = svg('path', { className: 'gauge__value', d: arcPath(), pathLength: 100, 'stroke-dasharray': '0 100' });

  const figure = h(
    'figure',
    {
      className: 'gauge',
      'data-level': level,
      role: 'img',
      'aria-label': `${label}: ${formatScore(score)} out of 100, ${riskLabel(level)}`,
    },
    h(
      'div',
      { className: 'gauge__dial', 'aria-hidden': 'true' },
      svg(
        'svg',
        { className: 'gauge__svg', viewBox: `0 0 ${SIZE} ${VIEW_HEIGHT}`, width: SIZE, height: VIEW_HEIGHT },
        svg('path', { className: 'gauge__track', d: arcPath(), pathLength: 100 }),
        valueArc,
      ),
      h('div', { className: 'gauge__center' }, number, h('span', { className: 'gauge__word' }, riskWord(level))),
    ),
    h('figcaption', { className: 'gauge__label' }, label),
  );

  // Start on the next frame so the section's entrance and the arc read as one motion.
  requestAnimationFrame(() => {
    springTo(0, score, (current) => {
      valueArc.setAttribute('stroke-dasharray', `${current.toFixed(2)} 100`);
      number.textContent = formatScore(current);
    }, { response: 0.9 });
  });

  return figure;
}

// Arc from 135° (bottom-left) clockwise through the top to 45° (bottom-right).
function arcPath() {
  const start = polar(135);
  const end = polar(45);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 1 1 ${end.x} ${end.y}`;
}

function polar(degrees) {
  const radians = (degrees * Math.PI) / 180;
  const centre = SIZE / 2;
  return { x: round(centre + RADIUS * Math.cos(radians)), y: round(centre + RADIUS * Math.sin(radians)) };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
