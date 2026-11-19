// Seeded PRNG (mulberry32) so mock data is identical on every load.

export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max]. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Float in [min, max). */
export function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** Deterministic Fisher–Yates shuffle (returns a copy). */
export function shuffle(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function randomId(rng, length) {
  let id = '';
  for (let i = 0; i < length; i += 1) id += ID_ALPHABET[Math.floor(rng() * ID_ALPHABET.length)];
  return id;
}

export function hexId(rng, prefix) {
  return `${prefix}${Math.floor(rng() * 0xffffff).toString(16).padStart(6, '0')}`;
}
