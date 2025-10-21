/**
 * @summary Convert a value to a finite, positive number or provide a fallback.
 * @param {unknown} value - The value to normalize into a positive number.
 * @param {number} [fallback=0] - Value to return when the input is not finite or non-positive.
 * @returns {number} A finite, positive number suitable for timer calculations.
 * @pseudocode
 * 1. Convert the incoming value to a number.
 * 2. When the conversion produces an infinite, NaN, or non-positive result, return the fallback.
 * 3. Otherwise, return the normalized number.
 */
export function toPositiveNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
}

/**
 * @summary Clamp timestamps to positive values above zero for monotonic calculations.
 * @param {unknown} value - The timestamp-like value to clamp.
 * @returns {number} A finite, positive timestamp.
 * @pseudocode
 * 1. Delegate to `toPositiveNumber` with `Number.EPSILON` as the fallback.
 * 2. Return the normalized timestamp for downstream use.
 */
export function clampToPositiveTimestamp(value) {
  return toPositiveNumber(value, Number.EPSILON);
}
