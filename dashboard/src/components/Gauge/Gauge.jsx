import { useEffect, useState } from 'react';
import { clampScore, formatScore, riskLabel, riskLevelFor, riskVar } from '../../lib/score.js';
import { useCountUp } from './useCountUp.js';
import './Gauge.css';

// 270° arc on a 120×120 box, opening at the bottom like a speedometer.
const RADIUS = 48;
const SWEEP = 270;
const ARC_LENGTH = 2 * Math.PI * RADIUS * (SWEEP / 360);
const ARC_PATH = 'M 26.06 93.94 A 48 48 0 1 1 93.94 93.94';

const PX = { sm: 104, md: 160, lg: 216 };

/**
 * Dual-purpose score dial. Colour follows the risk level but the number and
 * aria-label always carry the risk word, so meaning never rests on colour.
 */
export function Gauge({ value = 0, label = 'Score', size = 'md', className = '' }) {
  const score = clampScore(value);
  const level = riskLevelFor(score);
  const shown = useCountUp(score);
  const [armed, setArmed] = useState(false);

  // Let the first paint render an empty arc so the stroke transition can play.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const progress = armed ? score / 100 : 0;
  const offset = ARC_LENGTH * (1 - progress);
  const px = PX[size] ?? PX.md;
  const classes = ['gauge', `gauge--${size}`, `gauge--${level}`, className].filter(Boolean).join(' ');

  return (
    <figure
      className={classes}
      role="img"
      aria-label={`${label}: ${formatScore(score)} out of 100, ${riskLabel(level)}`}
      style={{ '--gauge-size': `${px}px`, '--gauge-color': riskVar(level) }}
    >
      <div className="gauge__dial">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <path className="gauge__track" d={ARC_PATH} />
          <path
            className="gauge__fill"
            d={ARC_PATH}
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge__value tabular">
          <span className="gauge__number">{formatScore(shown)}</span>
          <span className="gauge__unit">%</span>
        </div>
      </div>
      <figcaption className="gauge__label">{label}</figcaption>
    </figure>
  );
}
