// Compact text heuristics for the mock analysis. Pure, deterministic, no I/O.
import { lookupTerm, normaliseToken, PHRASES } from './lexicon.js';

const STOP_WORDS = new Set(('a an the and or but of to in on at for with by from as is are was were be ' +
  'this that these those it its he she they we you i his her their our your not no so if than then ' +
  'about into over after before up down out off new says said will can just more most very').split(' '));

export function hashText(text) {
  let hash = 0x811c9dc5; // FNV-1a, 32-bit
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// Deterministic pseudo-random in [0, 1) derived from a hash and a salt.
export function unitFromHash(hash, salt = 0) {
  return (hashText(`${hash}:${salt}`) % 10000) / 10000;
}

export function tokenize(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function contentWords(text) {
  return tokenize(text).map(normaliseToken).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Finds lexicon hits plus shouting / exclamation signals in a block of text.
export function textFeatures(text) {
  const tokens = tokenize(text);
  const hits = [];
  tokens.forEach((token, index) => {
    const entry = lookupTerm(token);
    if (entry) hits.push({ index, token, kind: entry.kind, weight: entry.weight });
    else if (isShouting(token)) hits.push({ index, token, kind: 'hyperbole', weight: 0.6 });
  });
  const lower = String(text || '').toLowerCase();
  PHRASES.forEach(([phrase, kind, weight]) => {
    if (lower.includes(phrase)) hits.push({ index: -1, token: phrase, kind, weight });
  });
  const wordCount = Math.max(tokens.length, 1);
  const sentences = Math.max((text.match(/[.!?](\s|$)/g) || []).length, 1);
  return {
    tokens,
    hits,
    hypeDensity: (hits.length / wordCount) * 100,
    capsRatio: tokens.filter(isShouting).length / wordCount,
    exclamationRate: (text.match(/!/g) || []).length / sentences,
    questionRate: (text.match(/\?/g) || []).length / sentences,
  };
}

function isShouting(token) {
  const letters = token.replace(/[^A-Za-z]/g, '');
  return letters.length >= 3 && letters === letters.toUpperCase();
}

// 0..100 "how sensational does this text read". Tuned so sober news lands 10–30
// and tabloid copy lands 60–90.
export function hypeScore(features, { headline = false } = {}) {
  const densityWeight = headline ? 14 : 22;
  const weightedHits = features.hits.reduce((sum, hit) => sum + hit.weight, 0);
  let score = Math.min(55, features.hypeDensity * densityWeight) + Math.min(20, weightedHits * 4);
  score += Math.min(15, features.capsRatio * 120);
  score += Math.min(15, features.exclamationRate * 25);
  score += Math.min(8, features.questionRate * 12);
  return clamp01to100(score);
}

// 0..100 how little the headline's words show up in the body (bait-and-switch proxy).
export function headlineBodyMismatch(headline, body) {
  const headWords = new Set(contentWords(headline));
  if (headWords.size === 0) return 40;
  const bodyWords = new Set(contentWords(body));
  let overlap = 0;
  headWords.forEach((word) => { if (bodyWords.has(word) || hasStem(bodyWords, word)) overlap += 1; });
  const coverage = overlap / headWords.size;
  return clamp01to100(Math.round((1 - coverage) * 85));
}

function hasStem(wordSet, word) {
  const stem = word.slice(0, Math.max(4, word.length - 2));
  for (const candidate of wordSet) if (candidate.startsWith(stem)) return true;
  return false;
}

export function clamp01to100(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
