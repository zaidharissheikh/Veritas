// Turns heuristic numbers into the human-facing parts of an AnalysisResult:
// excerpt, XAI highlights, stance and a plain-language summary.
import { textFeatures, tokenize, unitFromHash } from './heuristics.js';
import { riskLevelFor } from './score.js';

const EXCERPT_WORDS = 60;

// Headline + opening lines, capped at 60 words (CONTRACTS §5).
export function excerptOf(headline, body) {
  const words = [...tokenize(headline), ...tokenize(body)];
  return words.slice(0, EXCERPT_WORDS).join(' ');
}

// Highlights whose tokenIndex points into excerpt.split(/\s+/).
export function highlightsFor(excerpt) {
  return textFeatures(excerpt).hits
    .filter((hit) => hit.index >= 0)
    .map((hit) => ({
      tokenIndex: hit.index,
      token: hit.token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9!?]+$/g, ''),
      weight: Math.round(hit.weight * 100) / 100,
      kind: hit.kind,
    }));
}

// Top distinct lexicon terms across the whole text, for the summary sentence.
export function topTerms(hits, limit = 2) {
  const seen = new Set();
  return [...hits]
    .sort((a, b) => b.weight - a.weight)
    .map((hit) => hit.token.toLowerCase().replace(/[^a-z'\- ]/g, ''))
    .filter((term) => term && !seen.has(term) && seen.add(term))
    .slice(0, limit);
}

export function stanceFor(hash, mismatchScore) {
  const roll = unitFromHash(hash, 'stance');
  const level = riskLevelFor(mismatchScore);
  const options = {
    low: ['Agrees', 'Agrees', 'Discusses'],
    medium: ['Discusses', 'Agrees', 'Discusses'],
    high: ['Disagrees', 'Unrelated', 'Discusses'],
  }[level];
  const stanceLabel = options[Math.floor(roll * options.length)];
  const stanceConfidence = Math.round((0.58 + unitFromHash(hash, 'conf') * 0.37) * 100) / 100;
  return { stanceLabel, stanceConfidence };
}

export function summaryFor({ contentType, hype, secondary, terms }) {
  return `${toneSentence(hype, terms)} ${contentType === 'video' ? titleSentence(secondary) : headlineSentence(secondary)}`;
}

function toneSentence(hype, terms) {
  const examples = terms.length ? ` such as ${terms.map((t) => `“${t}”`).join(' and ')}` : '';
  const level = riskLevelFor(hype);
  if (level === 'high') return `Leans heavily on charged language${examples}.`;
  if (level === 'medium') return `Uses some charged wording${examples}, though most of the text reads calmly.`;
  return 'The wording is measured, with little charged language.';
}

function headlineSentence(mismatch) {
  const level = riskLevelFor(mismatch);
  if (level === 'high') return 'The headline promises more than the opening paragraphs deliver.';
  if (level === 'medium') return 'The headline stretches what the body actually says.';
  return 'The headline matches what the body says.';
}

function titleSentence(baitSwitch) {
  const level = riskLevelFor(baitSwitch);
  if (level === 'high') return 'The title reads like a hook the video may not pay off.';
  if (level === 'medium') return 'The title hints at more than it states outright.';
  return 'The title describes the video plainly.';
}
