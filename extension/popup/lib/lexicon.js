// Hype-word lexicon for the mock heuristic. kind: hyperbole | emotional | clickbait.
// Weights are 0.5..1 and drive both the score and the XAI highlight sizes.

const ENTRIES = [
  // hyperbole — exaggeration and absolutes
  ['shocking', 'hyperbole', 0.95], ['unbelievable', 'hyperbole', 0.92], ['insane', 'hyperbole', 0.9],
  ['epic', 'hyperbole', 0.75], ['massive', 'hyperbole', 0.7], ['huge', 'hyperbole', 0.6],
  ['stunning', 'hyperbole', 0.85], ['jaw-dropping', 'hyperbole', 0.95], ['mind-blowing', 'hyperbole', 0.95],
  ['incredible', 'hyperbole', 0.8], ['literally', 'hyperbole', 0.65], ['totally', 'hyperbole', 0.6],
  ['destroys', 'hyperbole', 0.88], ['destroyed', 'hyperbole', 0.85], ['obliterates', 'hyperbole', 0.9],
  ['crushes', 'hyperbole', 0.82], ['slams', 'hyperbole', 0.8], ['wrecks', 'hyperbole', 0.8],
  ['explosive', 'hyperbole', 0.85], ['bombshell', 'hyperbole', 0.9], ['miracle', 'hyperbole', 0.88],
  ['game-changer', 'hyperbole', 0.8], ['revolutionary', 'hyperbole', 0.7], ['never', 'hyperbole', 0.5],
  ['always', 'hyperbole', 0.5], ['everyone', 'hyperbole', 0.55], ['nobody', 'hyperbole', 0.55],
  ['worst', 'hyperbole', 0.7], ['best', 'hyperbole', 0.55], ['perfect', 'hyperbole', 0.6],
  ['ultimate', 'hyperbole', 0.7], ['unprecedented', 'hyperbole', 0.65], ['historic', 'hyperbole', 0.55],
  ['stunned', 'hyperbole', 0.85], ['slammed', 'hyperbole', 0.8], ['blasts', 'hyperbole', 0.8],
  ['blasted', 'hyperbole', 0.8], ['soars', 'hyperbole', 0.6], ['skyrockets', 'hyperbole', 0.75],
  ['plunges', 'hyperbole', 0.65], ['collapse', 'hyperbole', 0.6], ['surge', 'hyperbole', 0.55],
  ['surges', 'hyperbole', 0.55], ['double', 'hyperbole', 0.55], ['triple', 'hyperbole', 0.6],
  // emotional — fear, anger, outrage
  ['outrage', 'emotional', 0.9], ['outraged', 'emotional', 0.88], ['furious', 'emotional', 0.88],
  ['rage', 'emotional', 0.85], ['meltdown', 'emotional', 0.85], ['devastating', 'emotional', 0.85],
  ['terrifying', 'emotional', 0.9], ['horrifying', 'emotional', 0.9], ['disturbing', 'emotional', 0.8],
  ['chaos', 'emotional', 0.8], ['disaster', 'emotional', 0.75], ['crisis', 'emotional', 0.65],
  ['scandal', 'emotional', 0.8], ['panic', 'emotional', 0.8], ['fear', 'emotional', 0.7],
  ['threat', 'emotional', 0.6], ['danger', 'emotional', 0.6], ['dangerous', 'emotional', 0.65],
  ['nightmare', 'emotional', 0.85], ['heartbreaking', 'emotional', 0.8], ['tragic', 'emotional', 0.6],
  ['brutal', 'emotional', 0.75], ['savage', 'emotional', 0.8], ['humiliating', 'emotional', 0.85],
  ['warning', 'emotional', 0.6], ['urgent', 'emotional', 0.7], ['alarming', 'emotional', 0.75],
  ['deadly', 'emotional', 0.7], ['toxic', 'emotional', 0.7], ['hate', 'emotional', 0.7],
  ['warns', 'emotional', 0.55], ['warned', 'emotional', 0.5], ['fury', 'emotional', 0.85],
  ['crash', 'emotional', 0.6], ['crashes', 'emotional', 0.6], ['pressure', 'emotional', 0.45],
  // clickbait — curiosity gaps and secrets
  ['secret', 'clickbait', 0.85], ['secrets', 'clickbait', 0.85], ['exposed', 'clickbait', 0.85],
  ['revealed', 'clickbait', 0.75], ['reveals', 'clickbait', 0.7], ['truth', 'clickbait', 0.7],
  ['banned', 'clickbait', 0.75], ['hidden', 'clickbait', 0.65], ['finally', 'clickbait', 0.6],
  ['viral', 'clickbait', 0.75], ['trick', 'clickbait', 0.7], ['hack', 'clickbait', 0.65],
  ['hacks', 'clickbait', 0.65], ['weird', 'clickbait', 0.6], ['bizarre', 'clickbait', 0.65],
  ['breaking', 'clickbait', 0.7], ['must-see', 'clickbait', 0.85], ['must-read', 'clickbait', 0.85],
  ['exclusive', 'clickbait', 0.65], ['leaked', 'clickbait', 0.75], ['confirmed', 'clickbait', 0.55],
  ['genius', 'clickbait', 0.6], ['surprising', 'clickbait', 0.65], ['shocked', 'clickbait', 0.85],
  ['speechless', 'clickbait', 0.85], ['wow', 'clickbait', 0.6], ['omg', 'clickbait', 0.8],
];

// Multi-word curiosity-gap phrases, matched on the lower-cased text.
export const PHRASES = [
  ["you won't believe", 'clickbait', 0.95], ['you will not believe', 'clickbait', 0.95],
  ['what happened next', 'clickbait', 0.95], ["here's why", 'clickbait', 0.7],
  ['this is why', 'clickbait', 0.65], ['the reason why', 'clickbait', 0.6],
  ["doctors hate", 'clickbait', 0.95], ['one weird trick', 'clickbait', 0.95],
  ['will shock you', 'clickbait', 0.95], ['changed my life', 'clickbait', 0.8],
  ['number 7', 'clickbait', 0.7], ['goes viral', 'clickbait', 0.75],
];

const LEXICON = new Map(ENTRIES.map(([term, kind, weight]) => [term, { kind, weight }]));

export function normaliseToken(token) {
  return String(token).toLowerCase().replace(/[^a-z'-]/g, '');
}

export function lookupTerm(token) {
  return LEXICON.get(normaliseToken(token)) || null;
}
