/**
 * Implements the Mulberry32 pseudo-random number generator (PRNG) algorithm.
 *
 * @summary This function creates a deterministic PRNG that produces a sequence
 * of pseudo-random numbers based on an initial seed. The sequence is
 * reproducible given the same seed.
 *
 * @pseudocode
 * 1. Initialize an internal state variable `t` with the provided `seed`, ensuring it's an unsigned 32-bit integer.
 * 2. Return an inner function that, when called, generates the next pseudo-random number:
 *    a. Update `t` using a specific mathematical operation (`t += 0x6d2b79f5`).
 *    b. Perform a series of bitwise operations and `Math.imul` (32-bit multiplication) on `t` to generate intermediate values `r`.
 *    c. Apply further bitwise operations to `r`.
 *    d. Convert the final `r` to an unsigned 32-bit integer and divide by `4294967296` (2^32) to produce a float in the range `[0, 1)`.
 *
 * @param {number} seed - A 32-bit integer seed value to initialize the PRNG.
 * @returns {() => number} A function that, when invoked, returns the next pseudo-random floating-point number in the range `[0, 1)`.
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
 * Generates a deterministic pseudo-random integer within a specified range, inclusive.
 *
 * @summary This function uses a seeded PRNG to produce a reproducible integer
 * result, useful for simulations or tests requiring consistent random numbers.
 *
 * @pseudocode
 * 1. Create a new pseudo-random number generator (`rng`) using `mulberry32()` with the provided `seed`.
 * 2. Generate a pseudo-random floating-point number in the range `[0, 1)` by calling `rng()`.
 * 3. Scale this number to the desired integer range `[min, max]` (inclusive) using the formula: `Math.floor(rng() * (max - min + 1)) + min`.
 * 4. Return the calculated pseudo-random integer.
 *
 * @param {number} seed - The seed value for the pseudo-random number generator.
 * @param {number} min - The minimum integer value (inclusive) for the generated number.
 * @param {number} max - The maximum integer value (inclusive) for the generated number.
 * @returns {number} A pseudo-random integer between `min` and `max` (inclusive).
 */
export function seededInt(seed, min, max) {
  const rng = mulberry32(seed);
  const n = Math.floor(rng() * (max - min + 1)) + min;
  return n;
}
