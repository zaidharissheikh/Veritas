// Plain-language summaries. Never claims content is "fake" or "true".
import { pick } from './prng.js';

const ARTICLE = {
  low: [
    'The headline matches the body closely and the language stays measured. Little sign of sensationalism.',
    'A neutral headline followed by a body that reports what it promises. Charged wording is rare.',
  ],
  medium: [
    'The headline leans on emotive wording that the body only partly supports. Moderate sensationalism.',
    'Some charged phrasing in the opening lines; the article itself is more balanced than its headline.',
  ],
  high: [
    'The headline promises far more than the article delivers and stacks hyperbole and alarm words. Strong headline mismatch.',
    'Heavy use of emotional and exaggerated language, while the body describes a routine or minor event.',
  ],
};

const VIDEO = {
  low: [
    'The title describes the video accurately and the description stays factual. Little sign of bait-and-switch.',
    'Plain title, matching description. Hype language is minimal.',
  ],
  medium: [
    'The title adds urgency that the description does not fully back up. Moderate title hype.',
    'Some clickbait framing in the title; the content described is more ordinary than the wording suggests.',
  ],
  high: [
    'The title stacks shock and secrecy cues while the description points to a mundane topic. Strong bait-and-switch signal.',
    'Hyperbolic, emotionally loaded title that does not match what the video actually covers.',
  ],
};

export function summaryFor(contentType, level, rng) {
  return pick(rng, (contentType === 'video' ? VIDEO : ARTICLE)[level]);
}

/** Higher-risk articles more often drift away from their headline. */
export function stanceFor(level, rng) {
  const roll = rng();
  if (level === 'low') return roll < 0.75 ? 'Agrees' : 'Discusses';
  if (level === 'medium') return roll < 0.4 ? 'Agrees' : roll < 0.85 ? 'Discusses' : 'Disagrees';
  return roll < 0.2 ? 'Discusses' : roll < 0.65 ? 'Disagrees' : 'Unrelated';
}
