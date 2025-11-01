/**
 * @module judokaComparison
 * @description Utility for comparing stats and attributes between two judoka.
 * Provides detailed comparison metrics, differences calculation, and formatted reports.
 *
 * @exports validateComparisonIds
 * @exports validateJudokaForComparison
 * @exports calculateStatDifferences
 * @exports rankStatDifferences
 * @exports generateComparisonSummary
 * @exports formatComparisonReport
 * @exports getComparisonDocumentation
 */

/**
 * Validates that two judoka IDs are provided and different
 * @param {string|number} id1 - First judoka ID
 * @param {string|number} id2 - Second judoka ID
 * @returns {{valid: boolean, error?: string}}
 *
 * @pseudocode
 * IF id1 is null/undefined RETURN error "id1 required"
 * IF id2 is null/undefined RETURN error "id2 required"
 * IF id1 === id2 RETURN error "Cannot compare judoka with themselves"
 * IF id1 or id2 is not number/string RETURN error "IDs must be string or number"
 * RETURN {valid: true}
 */
export function validateComparisonIds(id1, id2) {
  if (id1 === null || id1 === undefined) {
    return { valid: false, error: "id1 is required for comparison" };
  }

  if (id2 === null || id2 === undefined) {
    return { valid: false, error: "id2 is required for comparison" };
  }

  // Normalize both IDs to numbers for comparison
  const normalizedId1 = Number(id1);
  const normalizedId2 = Number(id2);

  if (isNaN(normalizedId1) || isNaN(normalizedId2)) {
    return { valid: false, error: "IDs must be numeric or convertible to numbers" };
  }

  if (normalizedId1 === normalizedId2) {
    return { valid: false, error: "Cannot compare a judoka with themselves" };
  }

  return { valid: true };
}

/**
 * Validates that both judoka records exist and have required fields
 * @param {{}} judoka1 - First judoka record
 * @param {{}} judoka2 - Second judoka record
 * @returns {{valid: boolean, error?: string}}
 *
 * @pseudocode
 * IF judoka1 is null/undefined RETURN error "First judoka not found"
 * IF judoka2 is null/undefined RETURN error "Second judoka not found"
 * IF judoka1.stats is missing RETURN error "First judoka missing stats"
 * IF judoka2.stats is missing RETURN error "Second judoka missing stats"
 * RETURN {valid: true}
 */
export function validateJudokaForComparison(judoka1, judoka2) {
  if (!judoka1) {
    return { valid: false, error: "First judoka record not found" };
  }

  if (!judoka2) {
    return { valid: false, error: "Second judoka record not found" };
  }

  if (!judoka1.stats || typeof judoka1.stats !== "object") {
    return { valid: false, error: "First judoka missing stats object" };
  }

  if (!judoka2.stats || typeof judoka2.stats !== "object") {
    return { valid: false, error: "Second judoka missing stats object" };
  }

  return { valid: true };
}

/**
 * Calculates differences between two judoka's stats
 * @param {{}} judoka1 - First judoka record
 * {{}} judoka2 - Second judoka record
 * @returns {{statDifferences: {[key]: number}, avgDiff: number, totalDiff: number}}
 *
 * @pseudocode
 * statDifferences = {}
 * FOR each stat in judoka1.stats:
 *   stat1Value = judoka1.stats[stat] || 0
 *   stat2Value = judoka2.stats[stat] || 0
 *   statDifferences[stat] = stat1Value - stat2Value
 * totalDiff = sum of absolute differences
 * avgDiff = totalDiff / number of stats
 * RETURN {statDifferences, avgDiff, totalDiff}
 */
export function calculateStatDifferences(judoka1, judoka2) {
  const statDifferences = {};
  let totalAbsoluteDiff = 0;
  let statCount = 0;

  // Get all stat keys from both judoka
  const allStats = new Set([
    ...Object.keys(judoka1.stats || {}),
    ...Object.keys(judoka2.stats || {})
  ]);

  allStats.forEach((stat) => {
    const val1 = judoka1.stats?.[stat] ?? 0;
    const val2 = judoka2.stats?.[stat] ?? 0;
    statDifferences[stat] = val1 - val2;
    totalAbsoluteDiff += Math.abs(val1 - val2);
    statCount += 1;
  });

  const avgAbsoluteDiff = statCount > 0 ? totalAbsoluteDiff / statCount : 0;

  return {
    statDifferences,
    avgAbsoluteDiff,
    totalAbsoluteDiff,
    statCount
  };
}

/**
 * Ranks stats by largest differences (advantage/disadvantage)
 * @param {{[key]: number}} statDifferences - Stat differences object
 * @returns {Array<{stat: string, difference: number}>}
 *
 * @pseudocode
 * Convert statDifferences to array of {stat, difference}
 * Sort by absolute difference descending
 * RETURN sorted array
 */
export function rankStatDifferences(statDifferences) {
  if (!statDifferences || typeof statDifferences !== "object") {
    return [];
  }

  return Object.entries(statDifferences)
    .map(([stat, difference]) => ({
      stat,
      difference
    }))
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

/**
 * Generates a summary of the comparison
 * @param {{}} judoka1 - First judoka record
 * @param {{}} judoka2 - Second judoka record
 * @param {{}} differences - Stat differences object
 * @returns {{winner: string, margin: number, advantages: string[], disadvantages: string[]}}
 *
 * @pseudocode
 * Calculate sum of judoka1 stats vs judoka2 stats
 * IF judoka1 total > judoka2 total:
 *   winner = judoka1.name
 *   margin = judoka1 total - judoka2 total
 * ELSE IF judoka2 total > judoka1 total:
 *   winner = judoka2.name
 *   margin = judoka2 total - judoka1 total
 * ELSE:
 *   winner = "Tied"
 *   margin = 0
 * advantages = stats where judoka1 > judoka2
 * disadvantages = stats where judoka1 < judoka2
 * RETURN summary
 */
export function generateComparisonSummary(judoka1, judoka2, differences) {
  const stats1 = Object.values(judoka1.stats || {}).reduce((a, b) => a + b, 0);
  const stats2 = Object.values(judoka2.stats || {}).reduce((a, b) => a + b, 0);

  let winner;
  let margin;

  if (stats1 > stats2) {
    winner = `${judoka1.firstname} ${judoka1.surname}`;
    margin = stats1 - stats2;
  } else if (stats2 > stats1) {
    winner = `${judoka2.firstname} ${judoka2.surname}`;
    margin = stats2 - stats1;
  } else {
    winner = "Tied";
    margin = 0;
  }

  const advantages = Object.entries(differences.statDifferences)
    .filter(([, diff]) => diff > 0)
    .map(([stat]) => stat);

  const disadvantages = Object.entries(differences.statDifferences)
    .filter(([, diff]) => diff < 0)
    .map(([stat]) => stat);

  return {
    winner,
    margin,
    judoka1Total: stats1,
    judoka2Total: stats2,
    advantages,
    disadvantages
  };
}

/**
 * Formats a complete comparison report for display
 * @param {{}} judoka1 - First judoka record
 * @param {{}} judoka2 - Second judoka record
 * @returns {{
 *   title: string,
 *   judoka1Info: string,
 *   judoka2Info: string,
 *   comparison: string,
 *   details: {[key]: string}
 * }}
 *
 * @pseudocode
 * title = "{judoka1} vs {judoka2}"
 * judoka1Info = formatted basic info
 * judoka2Info = formatted basic info
 * Calculate differences
 * Generate summary
 * comparison = winner announcement with margin
 * details = stat-by-stat comparison
 * RETURN formatted report
 */
export function formatComparisonReport(judoka1, judoka2) {
  const differences = calculateStatDifferences(judoka1, judoka2);
  const summary = generateComparisonSummary(judoka1, judoka2, differences);
  const rankedDiffs = rankStatDifferences(differences.statDifferences);

  const title = `${judoka1.firstname} ${judoka1.surname} vs ${judoka2.firstname} ${judoka2.surname}`;

  const judoka1Info = `${judoka1.firstname} ${judoka1.surname} (${judoka1.country}, ${judoka1.rarity}, ${judoka1.weightClass})`;
  const judoka2Info = `${judoka2.firstname} ${judoka2.surname} (${judoka2.country}, ${judoka2.rarity}, ${judoka2.weightClass})`;

  let comparisonText = "";
  if (summary.winner === "Tied") {
    comparisonText = `${judoka1Info} and ${judoka2Info} are evenly matched`;
  } else if (summary.winner === judoka1Info) {
    comparisonText = `${judoka1Info} has the advantage with a margin of ${summary.margin} total stats`;
  } else {
    comparisonText = `${judoka2Info} has the advantage with a margin of ${summary.margin} total stats`;
  }

  const details = {};
  Object.entries(judoka1.stats || {}).forEach(([stat, val1]) => {
    const val2 = judoka2.stats?.[stat] ?? 0;
    const diff = val1 - val2;
    const diffStr = diff > 0 ? `+${diff}` : diff.toString();
    details[stat] = `${val1} vs ${val2} (${diffStr})`;
  });

  return {
    title,
    judoka1Info,
    judoka2Info,
    comparisonText,
    summary,
    rankedDifferences: rankedDiffs,
    statDetails: details
  };
}

/**
 * Provides documentation and schema for judoka comparison
 * @returns {{description: string, inputSchema: {}, outputSchema: {}, examples: Array}}
 *
 * @pseudocode
 * RETURN object with:
 *   - description of comparison capability
 *   - input schema (two judoka IDs)
 *   - output schema (comparison report)
 *   - example queries
 */
export function getComparisonDocumentation() {
  return {
    description:
      "Compare two judoka by ID, showing stat differences, advantages, disadvantages, and overall match-up analysis",
    inputSchema: {
      type: "object",
      properties: {
        id1: {
          type: ["string", "number"],
          description: "First judoka ID"
        },
        id2: {
          type: ["string", "number"],
          description: "Second judoka ID"
        }
      },
      required: ["id1", "id2"]
    },
    outputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Comparison title" },
        judoka1Info: { type: "string", description: "First judoka basic info" },
        judoka2Info: { type: "string", description: "Second judoka basic info" },
        comparisonText: { type: "string", description: "Human-readable comparison summary" },
        summary: {
          type: "object",
          properties: {
            winner: { type: "string", description: "Winner or 'Tied'" },
            margin: { type: "number", description: "Stat advantage margin" },
            judoka1Total: { type: "number" },
            judoka2Total: { type: "number" },
            advantages: { type: "array", description: "Stats where judoka1 leads" },
            disadvantages: { type: "array", description: "Stats where judoka2 leads" }
          }
        },
        rankedDifferences: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stat: { type: "string" },
              difference: { type: "number" }
            }
          },
          description: "Stats ranked by largest differences"
        },
        statDetails: {
          type: "object",
          description: "Stat-by-stat comparison (val1 vs val2 [difference])"
        }
      }
    },
    examples: [
      {
        description: "Compare two judoka by ID",
        input: { id1: 0, id2: 5 },
        expectedOutput:
          "Comparison report showing winner, stat advantages/disadvantages, and detailed breakdown"
      },
      {
        description: "Compare string IDs",
        input: { id1: "42", id2: "18" },
        expectedOutput: "Same as numeric IDs (auto-converted)"
      }
    ]
  };
}
