/**
 * Random judoka selection utility for MCP server
 * Provides random selection with optional filtering by country, rarity, or weight class
 */

/**
 * @typedef {Object} JudokaRecord
 * @property {string=} id - Unique identifier for the judoka.
 * @property {string=} name - Display name for the judoka.
 * @property {string=} country - ISO or readable country label for the judoka.
 * @property {string=} rarity - Rarity classification (e.g., Common, Epic, Legendary).
 * @property {string=} weightClass - Weight class descriptor (e.g., "-60", "+100").
 */

/**
 * @typedef {Object} RandomSelectionDocumentationFilter
 * @property {string} description - Explanation of the filter parameter.
 * @property {string} type - Primitive type accepted by the filter.
 * @property {string[]=} values - Optional enumerated values for the filter.
 */

/**
 * @typedef {Object} RandomFilterInput
 * @property {string=} country - Desired country filter value.
 * @property {"Common"|"Epic"|"Legendary"=} rarity - Desired rarity filter value.
 * @property {string=} weightClass - Desired weight class filter value.
 */

/**
 * @typedef {Object} RandomSelectionDocumentation
 * @property {string} description - Summary of the tool behaviour.
 * @property {{
 *   country: RandomSelectionDocumentationFilter,
 *   rarity: RandomSelectionDocumentationFilter & { values: string[] },
 *   weightClass: RandomSelectionDocumentationFilter
 * }} filters - Filter metadata available to the tool.
 * @property {{ description: string, input: { filters: Record<string, string> } }[]} examples - Usage examples.
 * @property {{
 *   judoka: string,
 *   filters: string,
 *   totalCount: string,
 *   matchCount: string
 * }} responseFormat - Description of the response payload.
 */

/**
 * Clone documentation data with compatibility fallback.
 * @param {RandomSelectionDocumentation} documentation
 * @returns {RandomSelectionDocumentation}
 */
function cloneRandomSelectionDocumentation(documentation) {
  if (typeof globalThis?.structuredClone === "function") {
    return globalThis.structuredClone(documentation);
  }

  return JSON.parse(JSON.stringify(documentation));
}

const RANDOM_DOCUMENTATION_BASE = /** @type {RandomSelectionDocumentation} */ ({
  description: "Select a random judoka from the database with optional filtering",
  filters: {
    country: {
      description: "Filter by country (e.g., 'Japan')",
      type: "string"
    },
    rarity: {
      description: "Filter by rarity level",
      type: "string",
      values: ["Common", "Epic", "Legendary"]
    },
    weightClass: {
      description: "Filter by weight class (e.g., '+100', '-60')",
      type: "string"
    }
  },
  examples: [
    {
      description: "Select any random judoka",
      input: { filters: {} }
    },
    {
      description: "Select random judoka from Japan",
      input: { filters: { country: "Japan" } }
    },
    {
      description: "Select random legendary judoka",
      input: { filters: { rarity: "Legendary" } }
    },
    {
      description: "Select random heavyweight from Japan",
      input: { filters: { country: "Japan", weightClass: "+100" } }
    }
  ],
  responseFormat: {
    judoka: "Complete judoka record with all fields",
    filters: "Validated filters applied",
    totalCount: "Total judoka in database",
    matchCount: "Judoka matching applied filters"
  }
});

/**
 * Canonical MCP documentation schema for the `judokon.random` MCP tool.
 *
 * @type {Readonly<RandomSelectionDocumentation>}
 * @const
 * @pseudocode
 * clone base documentation
 * freeze cloned documentation to prevent mutation
 * export frozen documentation for reuse
 */
export const RANDOM_SELECTION_DOCUMENTATION = Object.freeze(
  cloneRandomSelectionDocumentation(RANDOM_DOCUMENTATION_BASE)
);

/**
 * Validate and normalize incoming filter criteria to ensure safe random selection.
 *
 * @param {RandomFilterInput} [filters] - Raw filter criteria supplied by the caller.
 * @returns {RandomFilterInput} A sanitized set of filters with invalid values removed.
 * @pseudocode
 * if filters is not an object: return {}
 * create empty validated object
 * if country is a string: set trimmed country on validated
 * if rarity is one of the allowed values: set rarity on validated
 * if weightClass is a string: set trimmed weightClass on validated
 * return validated
 */
export function validateRandomFilters(filters) {
  if (!filters || typeof filters !== "object") {
    return {};
  }

  const validated = {};

  // Validate country filter
  if (filters.country && typeof filters.country === "string") {
    validated.country = filters.country.trim();
  }

  // Validate rarity filter
  const validRarities = ["Common", "Epic", "Legendary"];
  if (filters.rarity && validRarities.includes(filters.rarity)) {
    validated.rarity = filters.rarity;
  }

  // Validate weight class filter
  if (filters.weightClass && typeof filters.weightClass === "string") {
    validated.weightClass = filters.weightClass.trim();
  }

  return validated;
}

/**
 * Filter a list of judoka records using the provided filter criteria.
 *
 * @param {JudokaRecord[]} judokaArray - Candidate judoka collection to evaluate.
 * @param {RandomFilterInput} filters - Validated filter criteria.
 * @returns {JudokaRecord[]} Judoka that satisfy every provided filter.
 * @pseudocode
 * if judokaArray is empty: return []
 * if filters are empty: return judokaArray
 * return judokaArray.filter where each filter condition matches the judoka
 */
export function filterJudokaByFilters(judokaArray, filters) {
  if (!judokaArray || judokaArray.length === 0) {
    return [];
  }

  if (!filters || Object.keys(filters).length === 0) {
    return judokaArray;
  }

  return judokaArray.filter((judoka) => {
    if (filters.country && judoka.country !== filters.country) {
      return false;
    }
    if (filters.rarity && judoka.rarity !== filters.rarity) {
      return false;
    }
    if (filters.weightClass && judoka.weightClass !== filters.weightClass) {
      return false;
    }
    return true;
  });
}

/**
 * Resolve a numeric value from the provided RNG source.
 *
 * @param {(() => number) | { random: () => number }} rngSource - RNG function or object with a `random()` method.
 * @returns {number} Random value constrained to {@code [0, 1)}.
 * @throws {TypeError|RangeError} When RNG source is missing or returns invalid values.
 * @pseudocode
 * choose generator = rngSource if function else rngSource.random
 * if generator is not a function: throw TypeError
 * value = generator()
 * if value is not finite or outside [0, 1): throw RangeError
 * return value
 */
function getRandomValue(rngSource) {
  const generator = typeof rngSource === "function" ? rngSource : rngSource?.random;

  if (typeof generator !== "function") {
    throw new TypeError("getRandomValue requires a function or object with a random() method");
  }

  const value = generator.call(rngSource);

  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Random generator must return a finite number within [0, 1)");
  }

  return value;
}

/**
 * Select a random element from the provided array.
 *
 * @template T
 * @param {T[]} array - Array to sample from.
 * @param {(() => number) | { random: () => number }} [rng] - Random source returning values in [0, 1). Defaults to
 * Math.random when omitted.
 * @returns {T|null} A randomly selected element, or {@code null} when no values are available.
 * @pseudocode
 * if array is empty: return null
 * randomValue = getRandomValue(rng or Math.random)
 * index = floor(randomValue * array.length)
 * return array[index]
 */
export function selectRandomElement(array, rng = Math.random) {
  if (!array || array.length === 0) {
    return null;
  }

  const rngSource = arguments.length > 1 ? arguments[1] : Math.random;
  const randomIndex = Math.floor(getRandomValue(rngSource) * array.length);
  return array[randomIndex];
}

/**
 * Select random judoka from array with optional filters.
 *
 * @param {JudokaRecord[]} judokaArray - Array of judoka records.
 * @param {RandomFilterInput} filters - Optional filter criteria {country, rarity, weightClass}.
 * @returns {JudokaRecord|null} Random judoka record or null if no matches.
 * @pseudocode
 * validatedFilters = validateRandomFilters(filters)
 * candidates = filterJudokaByFilters(judokaArray, validatedFilters)
 * if candidates is empty: return null
 * return selectRandomElement(candidates)
 */
export function selectRandomJudoka(judokaArray, filters = {}) {
  if (!judokaArray || judokaArray.length === 0) {
    return null;
  }

  const validatedFilters = validateRandomFilters(filters);
  const candidates = filterJudokaByFilters(judokaArray, validatedFilters);

  if (candidates.length === 0) {
    return null;
  }

  return selectRandomElement(candidates);
}

/**
 * Get random judoka with metadata about selection.
 *
 * @param {JudokaRecord[]} judokaArray - Array of judoka records.
 * @param {RandomFilterInput} filters - Optional filter criteria.
 * @returns {{ judoka: JudokaRecord, filters: RandomFilterInput, totalCount: number, matchCount: number }|null}
 * Detailed selection payload or {@code null} if no matches.
 * @pseudocode
 * validatedFilters = validateRandomFilters(filters)
 * candidates = filterJudokaByFilters(judokaArray, validatedFilters)
 * if candidates is empty: return null
 * selected = selectRandomElement(candidates)
 * return { judoka: selected, filters: validatedFilters, totalCount: judokaArray.length, matchCount: candidates.length }
 */
export function getRandomJudokaWithMetadata(judokaArray, filters = {}) {
  if (!judokaArray || judokaArray.length === 0) {
    return null;
  }

  const validatedFilters = validateRandomFilters(filters);
  const candidates = filterJudokaByFilters(judokaArray, validatedFilters);

  if (candidates.length === 0) {
    return null;
  }

  const judoka = selectRandomElement(candidates);

  return {
    judoka,
    filters: validatedFilters,
    totalCount: judokaArray.length,
    matchCount: candidates.length
  };
}

/**
 * Get available filter options for random selection.
 *
 * @param {JudokaRecord[]} judokaArray - Array of judoka records.
 * @returns {{ countries: string[], rarities: string[], weightClasses: string[] }} Filter metadata.
 * @pseudocode
 * if judokaArray is empty: return empty arrays for each option
 * collect unique countries, rarities, weight classes using Sets
 * return sorted arrays of collected values
 */
export function getAvailableFilterOptions(judokaArray) {
  if (!judokaArray || judokaArray.length === 0) {
    return {
      countries: [],
      rarities: [],
      weightClasses: []
    };
  }

  const countries = new Set();
  const rarities = new Set();
  const weights = new Set();

  for (const judoka of judokaArray) {
    if (judoka.country) countries.add(judoka.country);
    if (judoka.rarity) rarities.add(judoka.rarity);
    if (judoka.weightClass) weights.add(judoka.weightClass);
  }

  return {
    countries: Array.from(countries).sort(),
    rarities: Array.from(rarities).sort(),
    weightClasses: Array.from(weights).sort()
  };
}

/**
 * Get documentation for random selection tool.
 *
 * @returns {RandomSelectionDocumentation} Tool documentation and examples.
 * @pseudocode return cloneRandomSelectionDocumentation(RANDOM_SELECTION_DOCUMENTATION)
 */
export function getRandomSelectionDocumentation() {
  return cloneRandomSelectionDocumentation(RANDOM_SELECTION_DOCUMENTATION);
}
