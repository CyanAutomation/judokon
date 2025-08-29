/**
 * Deterministic PRNG (mulberry32) with simple seeding.
 *
 * @param {number} seed - 32-bit seed value.
 * @returns {() => number} Function returning pseudo-random [0,1).
 */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded integer in range [min, max].
 * @param {number} seed
 * @param {number} min
 * @param {number} max
 */
export function seededInt(seed, min, max) {
  const rng = mulberry32(seed);
  const n = Math.floor(rng() * (max - min + 1)) + min;
  return n;
}

