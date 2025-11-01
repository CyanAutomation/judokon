/**
 * Advanced filter utility for MCP server
 * Supports stat thresholds, weight ranges, and composite filters
 */

/**
 * Parse a weight range filter like "-60" or "+100"
 * @param {string} weightClass - Weight class string (e.g., "-60", "+100")
 * @returns {Object} Parsed weight info {operator, value}
 * @pseudocode
 * if weightClass matches pattern /^([+\-])?(\d+)$/:
 *   if prefix is "+": return {operator: "gte", value}
 *   if prefix is "-": return {operator: "lte", value}
 *   otherwise: return {operator: "eq", value}
 * return null if no match
 * @private
 */
export function parseWeightClass(weightClass) {
  if (!weightClass || typeof weightClass !== "string") {
    return null;
  }

  const match = weightClass.match(/^([+\-])?(\d+)$/);
  if (!match) {
    return null;
  }

  const [, prefix, value] = match;
  const numValue = parseInt(value, 10);

  if (prefix === "+") {
    return { operator: "gte", value: numValue, description: `>= ${numValue}kg` };
  }
  if (prefix === "-") {
    return { operator: "lte", value: numValue, description: `<= ${numValue}kg` };
  }

  // No prefix = exact match
  return { operator: "eq", value: numValue, description: `exactly ${numValue}kg` };
}

/**
 * Parse a stat threshold filter like "power>=8" or "speed < 5"
 * @param {string} filter - Filter string (e.g., "power>=8", "technique < 5")
 * @returns {Object} Parsed filter {stat, operator, value} or null if invalid
 * @pseudocode
 * if filter matches pattern /^(\w+)\s*([><=!]+)\s*(\d+)$/:
 *   extract stat, operator, value
 *   if stat is in [power, speed, technique, kumikata, newaza]:
 *     if operator is valid [>=, <=, >, <, ==, !=]:
 *       return {stat, operator (normalized), value, description}
 * return null if any validation fails
 * @private
 */
export function parseStatFilter(filter) {
  if (!filter || typeof filter !== "string") {
    return null;
  }

  // Match patterns like "power>=8" or "technique < 5"
  const match = filter.toLowerCase().match(/^(\w+)\s*([><=!]+)\s*(\d+)$/);
  if (!match) {
    return null;
  }

  const [, stat, operator, value] = match;
  const numValue = parseInt(value, 10);

  // Valid stat names
  const validStats = ["power", "speed", "technique", "kumikata", "newaza"];
  if (!validStats.includes(stat)) {
    return null;
  }

  // Validate operator
  const validOperators = [">=", "<=", ">", "<", "=", "==", "!="];
  if (!validOperators.includes(operator)) {
    return null;
  }

  // Normalize operator
  let normalizedOp = operator;
  if (operator === "=") normalizedOp = "==";

  return {
    stat: stat.toLowerCase(),
    operator: normalizedOp,
    value: numValue,
    description: `${stat} ${operator} ${numValue}`
  };
}

/**
 * Evaluate a stat threshold against a judoka's stats
 * @param {Object} stats - Judoka stats object
 * @param {string} stat - Stat name (power, speed, technique, kumikata, newaza)
 * @param {string} operator - Comparison operator (>=, <=, >, <, ==, !=)
 * @param {number} threshold - Threshold value
 * @returns {boolean} True if judoka meets threshold
 * @private
 */
function evaluateStatThreshold(stats, stat, operator, threshold) {
  const statValue = stats[stat];
  if (statValue === undefined || statValue === null) {
    return false;
  }

  switch (operator) {
    case ">=":
      return statValue >= threshold;
    case "<=":
      return statValue <= threshold;
    case ">":
      return statValue > threshold;
    case "<":
      return statValue < threshold;
    case "==":
    case "=":
      return statValue === threshold;
    case "!=":
      return statValue !== threshold;
    default:
      return false;
  }
}

/**
 * Evaluate a weight range filter against a judoka's weight class
 * @param {string} judokaWeightClass - Judoka's weight class string
 * @param {Object} parsed - Parsed weight filter {operator, value}
 * @returns {boolean} True if judoka matches weight range
 * @private
 */
function evaluateWeightRange(judokaWeightClass, parsed) {
  if (!judokaWeightClass || !parsed) {
    return false;
  }

  const judokaWeightMatch = judokaWeightClass.match(/^([+\-])?(\d+)$/);
  if (!judokaWeightMatch) {
    return false;
  }

  const [, prefix, value] = judokaWeightMatch;
  const judokaWeight = parseInt(value, 10);

  // Determine if judoka is in + or - category
  const judokaIsPlus = prefix === "+";
  const filterIsPlus = parsed.operator === "gte";
  const filterIsMinus = parsed.operator === "lte";

  // For "+100" class (plus category):
  if (filterIsPlus) {
    // Match judoka in + category
    return judokaIsPlus;
  }

  // For "-60" class (minus category):
  if (filterIsMinus) {
    // Match judoka in - category and weight <= filter value
    return !judokaIsPlus && judokaWeight <= parsed.value;
  }

  // For exact match (no prefix)
  if (parsed.operator === "eq") {
    // Match exact weight class
    return judokaWeight === parsed.value && !judokaIsPlus;
  }

  return false;
}

/**
 * Apply advanced filters to a judoka record
 * @param {Object} judoka - Judoka record
 * @param {Object} advancedFilters - Advanced filters object
 * @returns {boolean} True if judoka matches all filters
 * @pseudocode
 * for each filter type in [statThresholds, weightRange, minAverageStats, maxAverageStats, minAllStats]:
 *   if filter is defined:
 *     if judoka does not match this filter: return false
 * return true (all filters passed with AND logic)
 */
export function applyAdvancedFilters(judoka, advancedFilters) {
  if (!advancedFilters || Object.keys(advancedFilters).length === 0) {
    return true;
  }

  // Check stat thresholds
  if (advancedFilters.statThresholds && Array.isArray(advancedFilters.statThresholds)) {
    for (const threshold of advancedFilters.statThresholds) {
      const parsed = parseStatFilter(threshold);
      if (!parsed) {
        continue; // Skip invalid filters
      }

      const statValue = judoka.stats[parsed.stat];
      if (statValue === undefined) {
        return false; // Judoka doesn't have this stat
      }

      if (!evaluateStatThreshold(judoka.stats, parsed.stat, parsed.operator, parsed.value)) {
        return false;
      }
    }
  }

  // Check weight range
  if (advancedFilters.weightRange) {
    const parsed = parseWeightClass(advancedFilters.weightRange);
    if (parsed && !evaluateWeightRange(judoka.weightClass, parsed)) {
      return false;
    }
  }

  // Check minimum average stats
  if (advancedFilters.minAverageStats !== undefined && advancedFilters.minAverageStats > 0) {
    const stats = judoka.stats;
    const avg = (stats.power + stats.speed + stats.technique + stats.kumikata + stats.newaza) / 5;
    if (avg < advancedFilters.minAverageStats) {
      return false;
    }
  }

  // Check maximum average stats
  if (advancedFilters.maxAverageStats !== undefined && advancedFilters.maxAverageStats > 0) {
    const stats = judoka.stats;
    const avg = (stats.power + stats.speed + stats.technique + stats.kumikata + stats.newaza) / 5;
    if (avg > advancedFilters.maxAverageStats) {
      return false;
    }
  }

  // Check all stats minimum (skill floor)
  if (advancedFilters.minAllStats !== undefined && advancedFilters.minAllStats > 0) {
    const stats = judoka.stats;
    if (
      stats.power < advancedFilters.minAllStats ||
      stats.speed < advancedFilters.minAllStats ||
      stats.technique < advancedFilters.minAllStats ||
      stats.kumikata < advancedFilters.minAllStats ||
      stats.newaza < advancedFilters.minAllStats
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Parse and validate advanced filters from input
 * @param {Object} filters - Raw filter input
 * @returns {Object} Validated advanced filters
 * @pseudocode
 * initialize validatedFilters = {}
 * for each filter entry in filters:
 *   if statThresholds: parse each filter, keep only valid ones
 *   if weightRange: parse and include if valid
 *   if minAverageStats: include if number in range [0, 10]
 *   if maxAverageStats: include if number in range [0, 10]
 *   if minAllStats: include if number in range [0, 10]
 * return validatedFilters (all invalid entries removed)
 */
export function validateAdvancedFilters(filters) {
  if (!filters || typeof filters !== "object") {
    return {};
  }

  const validated = {};

  // Validate stat thresholds
  if (filters.statThresholds) {
    if (Array.isArray(filters.statThresholds)) {
      const validThresholds = filters.statThresholds.filter((t) => {
        const parsed = parseStatFilter(t);
        return parsed !== null;
      });
      if (validThresholds.length > 0) {
        validated.statThresholds = validThresholds;
      }
    }
  }

  // Validate weight range
  if (filters.weightRange) {
    const parsed = parseWeightClass(filters.weightRange);
    if (parsed) {
      validated.weightRange = filters.weightRange;
    }
  }

  // Validate average stats
  if (filters.minAverageStats !== undefined) {
    const val = parseFloat(filters.minAverageStats);
    if (!Number.isNaN(val) && val >= 0 && val <= 10) {
      validated.minAverageStats = val;
    }
  }

  if (filters.maxAverageStats !== undefined) {
    const val = parseFloat(filters.maxAverageStats);
    if (!Number.isNaN(val) && val >= 0 && val <= 10) {
      validated.maxAverageStats = val;
    }
  }

  // Validate min all stats
  if (filters.minAllStats !== undefined) {
    const val = parseFloat(filters.minAllStats);
    if (!Number.isNaN(val) && val >= 0 && val <= 10) {
      validated.minAllStats = val;
    }
  }

  return validated;
}

/**
 * Get filter documentation and examples
 * @returns {Object} Filter documentation with schema and examples for each filter type
 * @pseudocode
 * return documentation object containing:
 *   - statThresholds: description, valid operators, valid stat names, examples
 *   - weightRange: description, format, examples
 *   - minAverageStats: description, example
 *   - maxAverageStats: description, example
 *   - minAllStats: description, example
 */
export function getFilterDocumentation() {
  return {
    statThresholds: {
      description:
        "Array of stat threshold filters. Each filter compares a stat to a threshold value.",
      operators: [">=", "<=", ">", "<", "==", "!="],
      validStats: ["power", "speed", "technique", "kumikata", "newaza"],
      examples: ["power>=8", "speed<5", "technique==9", "kumikata!=0"]
    },
    weightRange: {
      description: "Filter by weight class using +/- prefix notation",
      examples: ["+100 (heavy class)", "-60 (light class)", "-70 (under 70kg exact)"],
      format: "[+|-]<number>"
    },
    minAverageStats: {
      description: "Minimum average of all stats (0-10)",
      examples: [7, 8.5, 9]
    },
    maxAverageStats: {
      description: "Maximum average of all stats (0-10)",
      examples: [3, 5.5, 7]
    },
    minAllStats: {
      description: "Minimum value for all stats (skill floor)",
      examples: [5, 6, 7]
    }
  };
}

export default {
  applyAdvancedFilters,
  validateAdvancedFilters,
  getFilterDocumentation,
  parseStatFilter,
  parseWeightClass
};
