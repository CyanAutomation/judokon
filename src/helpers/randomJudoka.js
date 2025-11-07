/**
 * Random judoka selection utility for MCP server
 * Provides random selection with optional filtering by country, rarity, or weight class
 */

/**
 * @typedef {Object} RandomSelectionDocumentationFilter
 * @property {string} description - Explanation of the filter parameter.
 * @property {string} type - Primitive type accepted by the filter.
 * @property {string[]=} values - Optional enumerated values for the filter.
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
 * Canonical MCP documentation schema for the judokon.random tool.
 * @type {Readonly<RandomSelectionDocumentation>}
 * @const
 * @pseudocode
 * create deep clone of documentation base
 * freeze the clone to prevent mutation
 * expose the frozen documentation for reuse across modules
 */
export const RANDOM_SELECTION_DOCUMENTATION = Object.freeze(
  JSON.parse(JSON.stringify(RANDOM_DOCUMENTATION_BASE))
);

/**
 * Validate random selection filters
 * @param {Object} filters - Filter criteria object
 * @returns {Object} Validated filters (empty object if none provided)
 * @pseudocode
 * initialize validated = {}
 * if filters.country exists and is string: validated.country = filters.country
 * if filters.rarity exists and is in [Common, Epic, Legendary]: validated.rarity = filters.rarity
 * if filters.weightClass exists and is string: validated.weightClass = filters.weightClass
 * return validated (invalid filters removed)
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
 * Filter judoka array based on criteria
 * @param {Array} judokaArray - Array of judoka records
 * @param {Object} filters - Validated filter criteria
 * @returns {Array} Filtered judoka array
 * @pseudocode
 * initialize candidates = []
 * for each judoka in judokaArray:
 *   if country filter exists and judoka.country != filters.country: continue
 *   if rarity filter exists and judoka.rarity != filters.rarity: continue
 *   if weightClass filter exists and judoka.weightClass != filters.weightClass: continue
 *   add judoka to candidates
 * return candidates
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
 * Select a random element from an array
 * @param {Array} array - Array to select from
 * @returns {*} Random element or null if array is empty
 * @pseudocode
 * if array is empty: return null
 * randomIndex = Math.floor(Math.random() * array.length)
 * return array[randomIndex]
 */
export function selectRandomElement(array) {
  if (!array || array.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

/**
 * Select random judoka from array with optional filters
 * @param {Array} judokaArray - Array of judoka records
 * @param {Object} filters - Optional filter criteria {country, rarity, weightClass}
 * @returns {Object} Random judoka record or null if no matches
 * @pseudocode
 * validate filters using validateRandomFilters()
 * filter judoka array using filterJudokaByFilters()
 * select random judoka from filtered array using selectRandomElement()
 * return random judoka or null
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
 * Get random judoka with metadata about selection
 * @param {Array} judokaArray - Array of judoka records
 * @param {Object} filters - Optional filter criteria
 * @returns {Object} {judoka, filters, totalCount, matchCount} or null if no matches
 * @pseudocode
 * validate filters using validateRandomFilters()
 * filter judoka array using filterJudokaByFilters()
 * select random judoka from filtered array
 * return {
 *   judoka: selected judoka record,
 *   filters: filters applied,
 *   totalCount: length of original array,
 *   matchCount: length of filtered array
 * }
 * return null if no matches
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
 * Get available filter options for random selection
 * @param {Array} judokaArray - Array of judoka records
 * @returns {Object} Available countries, rarities, weight classes
 * @pseudocode
 * initialize sets for countries, rarities, weights
 * for each judoka in judokaArray:
 *   add judoka.country to countries set
 *   add judoka.rarity to rarities set
 *   add judoka.weightClass to weights set
 * return {
 *   countries: sorted array of unique countries,
 *   rarities: sorted array of unique rarities,
 *   weightClasses: sorted array of unique weight classes
 * }
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
 * Get documentation for random selection tool
 * @returns {Object} Tool documentation and examples
 * @pseudocode
 * return documentation object containing:
 *   - description of random selection
 *   - available filters
 *   - examples of usage
 *   - response format
 */
export function getRandomSelectionDocumentation() {
  return JSON.parse(JSON.stringify(RANDOM_SELECTION_DOCUMENTATION));
}
