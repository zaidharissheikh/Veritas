// Vocabulary the mock "model" flags. Keys are lower-case, punctuation-free.
// Any token in an excerpt that matches one of these becomes a highlight.

const VOCABULARY = {
  // hyperbole
  shocking: 'hyperbole',
  unbelievable: 'hyperbole',
  insane: 'hyperbole',
  destroyed: 'hyperbole',
  devastating: 'hyperbole',
  explosive: 'hyperbole',
  massive: 'hyperbole',
  bombshell: 'hyperbole',
  catastrophic: 'hyperbole',
  obliterates: 'hyperbole',
  slams: 'hyperbole',
  skyrocket: 'hyperbole',
  miracle: 'hyperbole',
  unprecedented: 'hyperbole',
  'game-changing': 'hyperbole',
  humiliated: 'hyperbole',
  meltdown: 'hyperbole',
  chaos: 'hyperbole',
  // emotional
  outrage: 'emotional',
  furious: 'emotional',
  terrifying: 'emotional',
  heartbreaking: 'emotional',
  panic: 'emotional',
  fear: 'emotional',
  disgusting: 'emotional',
  horrifying: 'emotional',
  scandal: 'emotional',
  nightmare: 'emotional',
  betrayed: 'emotional',
  desperate: 'emotional',
  dangerous: 'emotional',
  warning: 'emotional',
  alarming: 'emotional',
  threatens: 'emotional',
  // clickbait
  secret: 'clickbait',
  finally: 'clickbait',
  exposed: 'clickbait',
  revealed: 'clickbait',
  truth: 'clickbait',
  'wont': 'clickbait',
  believe: 'clickbait',
  everyone: 'clickbait',
  nobody: 'clickbait',
  hidden: 'clickbait',
  trick: 'clickbait',
  hack: 'clickbait',
  'must-see': 'clickbait',
  'must-read': 'clickbait',
  'jaw-dropping': 'clickbait',
  'mind-blowing': 'clickbait',
  'life-changing': 'clickbait',
  gone: 'clickbait',
  wrong: 'clickbait',
  // milder cues that still nudge a score
  surge: 'hyperbole',
  steep: 'hyperbole',
  stranded: 'hyperbole',
  heated: 'emotional',
  fears: 'emotional',
  collapse: 'emotional',
  blamed: 'emotional',
  demand: 'emotional',
  critics: 'emotional',
  quietly: 'clickbait',
  really: 'clickbait',
  viral: 'clickbait',
  sweeping: 'clickbait',
  actually: 'clickbait',
};

export function normaliseToken(token) {
  return token.toLowerCase().replace(/^[^a-z0-9-]+|[^a-z0-9-]+$/g, '').replace(/['’]/g, '');
}

export function kindOf(token) {
  const key = normaliseToken(token);
  // Own keys only, so words like "constructor" never resolve to Object.prototype members.
  return Object.prototype.hasOwnProperty.call(VOCABULARY, key) ? VOCABULARY[key] : null;
}
