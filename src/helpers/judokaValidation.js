export const requiredJudokaFields = [
  "firstname",
  "surname",
  "country",
  "countryCode",
  "stats",
  "weightClass",
  "signatureMoveId",
  "rarity"
];

export const requiredStatsFields = ["power", "speed", "technique", "kumikata", "newaza"];

/**
 * Returns an array of missing fields from a judoka object.
 *
 * @pseudocode
 * 1. Initialize an empty `missing` array.
 * 2. Check each field in `requiredJudokaFields`:
 *    - If `judoka[field]` is `undefined` or `null`, add `field` to `missing`.
 * 3. Check required stats subfields:
 *    - If `judoka.stats` is `null` or `undefined`,
 *      - Add `stats` and every `stats.<subfield>` to `missing`.
 *    - Otherwise, for each subfield in `requiredStatsFields`,
 *      - Add `stats.<subfield>` when the value is `undefined` or `null`.
 * 4. Return the `missing` array.
 *
 * @param {Object} judoka - Judoka object to inspect.
 * @returns {string[]} Array of missing field names.
 */
export function getMissingJudokaFields(judoka) {
  const missing = [];
  if (!judoka || typeof judoka !== "object") {
    return requiredJudokaFields.concat(requiredStatsFields.map((f) => `stats.${f}`));
  }

  for (const field of requiredJudokaFields) {
    if (judoka[field] === undefined || judoka[field] === null) {
      missing.push(field);
    }
  }

  if (judoka.stats === undefined || judoka.stats === null) {
    for (const sub of requiredStatsFields) {
      missing.push(`stats.${sub}`);
    }
  } else {
    for (const sub of requiredStatsFields) {
      if (judoka.stats[sub] === undefined || judoka.stats[sub] === null) {
        missing.push(`stats.${sub}`);
      }
    }
  }

  return missing;
}

/**
 * Determines whether a judoka object contains all required fields.
 *
 * @pseudocode
 * 1. Call `getMissingJudokaFields` with the provided `judoka`.
 * 2. Return `true` if the resulting array is empty; otherwise return `false`.
 *
 * @param {Object} judoka - Judoka object to check.
 * @returns {boolean} `true` when all required fields are present.
 */
export function hasRequiredJudokaFields(judoka) {
  return getMissingJudokaFields(judoka).length === 0;
}
