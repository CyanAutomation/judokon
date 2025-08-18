/**
 * Deep merge two plain objects.
 * Arrays are replaced, not merged, and inputs are not mutated.
 *
 * @pseudocode
 * 1. Create a shallow copy of `target`.
 * 2. For each key in `source`:
 *    - If both values are plain objects, recursively merge them.
 *    - Otherwise, assign a cloned array or the source value.
 * 3. Return the merged copy.
 *
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @returns {Record<string, any>} New merged object.
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const targetValue = target[key];
    if (isPlainObject(targetValue) && isPlainObject(value)) {
      result[key] = deepMerge(targetValue, value);
    } else if (Array.isArray(value)) {
      result[key] = [...value];
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * @param {any} value
 * @returns {value is Record<string, any>}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
