#!/usr/bin/env node

/**
 * MCP server for JU-DO-KON! judoka tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { expandQuery } from "../src/helpers/queryExpander.js";
import { applyAdvancedFilters, validateAdvancedFilters } from "../src/helpers/advancedFilters.js";
import {
  validateRandomFilters,
  selectRandomJudoka,
  // eslint-disable-next-line no-unused-vars
  getRandomJudokaWithMetadata,
  // eslint-disable-next-line no-unused-vars
  getAvailableFilterOptions
} from "../src/helpers/randomJudoka.js";
import {
  validateComparisonIds,
  validateJudokaForComparison,
  formatComparisonReport
} from "../src/helpers/judokaComparison.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ Data Loading ============

// Load judoka data
const judokaPath = path.join(__dirname, "../src/data/judoka.json");
const judokaData = JSON.parse(fs.readFileSync(judokaPath, "utf8"));
const judokaById = new Map(judokaData.map((j) => [String(j.id), j]));

console.error(`Loaded ${judokaData.length} judoka records`);

const server = new Server(
  {
    name: "judokon-rag",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "judokon.search",
        description:
          "Search judoka records with optional filtering by country, rarity, weight class, and advanced criteria (stat thresholds, weight ranges, average stats)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'powerful judoka from Japan')"
            },
            topK: {
              type: "integer",
              minimum: 1,
              maximum: 50,
              default: 8,
              description: "Maximum number of results to return"
            },
            filters: {
              type: "object",
              description: "Optional filters to narrow search results",
              properties: {
                country: {
                  type: "string",
                  description: "Filter by country (e.g., 'Japan', 'France')"
                },
                rarity: {
                  type: "string",
                  enum: ["Common", "Epic", "Legendary"],
                  description: "Filter by judoka rarity"
                },
                weightClass: {
                  type: "string",
                  description: "Filter by weight class (e.g., '+100', '-60')"
                },
                advanced: {
                  type: "object",
                  description:
                    "Advanced filters for stat thresholds, weight ranges, and composite criteria",
                  properties: {
                    statThresholds: {
                      type: "array",
                      items: {
                        type: "string"
                      },
                      description:
                        "Array of stat comparisons (e.g., ['power>=8', 'speed<5']). Valid stats: power, speed, technique, kumikata, newaza. Operators: >=, <=, >, <, ==, !="
                    },
                    weightRange: {
                      type: "string",
                      description:
                        "Weight range filter (e.g., '+100' for 100kg+, '-60' for ≤60kg, or exact value)"
                    },
                    minAverageStats: {
                      type: "number",
                      description: "Minimum average value across all 5 stats"
                    },
                    maxAverageStats: {
                      type: "number",
                      description: "Maximum average value across all 5 stats"
                    },
                    minAllStats: {
                      type: "number",
                      description: "All stats must be at least this value (skill floor)"
                    }
                  }
                }
              }
            }
          },
          required: ["query"]
        }
      },
      {
        name: "judokon.getById",
        description: "Fetch the complete judoka record by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: ["string", "number"],
              description: "Judoka ID (numeric or string format)"
            }
          },
          required: ["id"]
        }
      },
      {
        name: "judokon.random",
        description:
          "Select a random judoka from the database with optional filtering by country, rarity, or weight class",
        inputSchema: {
          type: "object",
          properties: {
            filters: {
              type: "object",
              description: "Optional filter criteria for random selection",
              properties: {
                country: {
                  type: "string",
                  description: "Filter by country (e.g., 'Japan')"
                },
                rarity: {
                  type: "string",
                  enum: ["Common", "Epic", "Legendary"],
                  description: "Filter by judoka rarity"
                },
                weightClass: {
                  type: "string",
                  description: "Filter by weight class (e.g., '+100', '-60')"
                }
              }
            }
          }
        }
      },
      {
        name: "judokon.compare",
        description: "Compare stats and attributes between two judoka by ID",
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
        }
      }
    ]
  };
});

// ============ Tool Handlers ============

/**
 * Handle judokon.search tool requests
 * @param {string} query - Search query string
 * @param {number} topK - Maximum results to return
 * @param {Object} filters - Optional filters (country, rarity, weightClass)
 * @returns {Promise<Object>} Search results
 */
/**
 * Execute judoka search with query, filters, and result limit.
 * This is the core search logic with query expansion (cache-agnostic).
 * @param {string} query - Search query
 * @param {number} topK - Result limit
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Search results with expansion metadata
 * @private
 */
async function executeJudokonSearch(query, topK, filters) {
  // Expand query with synonyms for improved relevance
  const expansion = await expandQuery(query);
  const searchQuery = expansion.hasExpansion ? expansion.expanded : query;

  // Find judoka matching the query and apply filters
  const candidates = [];
  const normalizedTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

  // Validate and prepare advanced filters
  const advancedFilters = validateAdvancedFilters(filters.advanced || {});

  for (const judoka of judokaData) {
    // Apply basic filters (country, rarity, exact weight)
    if (filters.country && judoka.country !== filters.country) continue;
    if (filters.rarity && judoka.rarity !== filters.rarity) continue;

    // Apply advanced filters (stat thresholds, weight ranges, averages)
    if (!applyAdvancedFilters(judoka, advancedFilters)) continue;

    const searchableText = [
      judoka.firstname,
      judoka.surname,
      judoka.country,
      judoka.rarity,
      judoka.weightClass,
      judoka.category,
      judoka.bio
    ]
      .join(" ")
      .toLowerCase();

    const hitCount = normalizedTerms.filter((term) => searchableText.includes(term)).length;
    const score = normalizedTerms.length > 0 ? hitCount / normalizedTerms.length : 0;
    if (score <= 0) continue;

    candidates.push({
      id: judoka.id,
      name: `${judoka.firstname} ${judoka.surname}`,
      country: judoka.country,
      countryCode: judoka.countryCode,
      rarity: judoka.rarity,
      weightClass: judoka.weightClass,
      stats: judoka.stats,
      bio: judoka.bio,
      score
    });
  }

  // Sort by score descending and limit to topK
  const results = candidates.sort((a, b) => b.score - a.score).slice(0, topK);

  return {
    results,
    query,
    topK,
    filters: Object.keys(filters).length > 0 ? filters : null,
    count: results.length,
    _expansion: expansion
  };
}

/**
 * Handle judokon.getById tool requests
 * @param {string|number} id - Judoka ID
 * @returns {Promise<Object>} Judoka record or error
 */
async function handleJudokonGetById(id) {
  // Normalize ID to string for lookup
  const normalizedId = String(id);

  // Try direct lookup
  let judoka = judokaById.get(normalizedId);

  // If not found, try numeric conversion
  if (!judoka && !Number.isNaN(Number(id))) {
    judoka = judokaById.get(String(Number(id)));
  }

  if (!judoka) {
    return { found: false, id: normalizedId, message: "Judoka not found" };
  }

  return {
    found: true,
    id: judoka.id,
    firstname: judoka.firstname,
    surname: judoka.surname,
    name: `${judoka.firstname} ${judoka.surname}`,
    country: judoka.country,
    countryCode: judoka.countryCode,
    weightClass: judoka.weightClass,
    category: judoka.category,
    rarity: judoka.rarity,
    gender: judoka.gender,
    stats: judoka.stats,
    bio: judoka.bio,
    profileUrl: judoka.profileUrl,
    signatureMoveId: judoka.signatureMoveId,
    cardCode: judoka.cardCode,
    matchesWon: judoka.matchesWon,
    matchesLost: judoka.matchesLost,
    matchesDrawn: judoka.matchesDrawn,
    isHidden: judoka.isHidden,
    lastUpdated: judoka.lastUpdated
  };
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "judokon.search") {
    const { query, topK = 8, filters = {} } = args;

    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required and must be a string");
    }

    try {
      const searchResults = await executeJudokonSearch(query, topK, filters);

      if (searchResults.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No judoka found matching "${query}"${
                Object.keys(filters).length > 0 ? ` with filters: ${JSON.stringify(filters)}` : ""
              }`
            }
          ]
        };
      }

      const resultsText = searchResults.results
        .map((judoka, index) => {
          return (
            `**${index + 1}. ${judoka.name}** (${judoka.rarity})\n` +
            `   Country: ${judoka.country}\n` +
            `   Weight Class: ${judoka.weightClass}\n` +
            `   Stats: Power=${judoka.stats?.power}, Speed=${judoka.stats?.speed}, ` +
            `Technique=${judoka.stats?.technique}\n` +
            `   Relevance: ${(judoka.score * 100).toFixed(0)}%`
          );
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${searchResults.results.length} judoka matching "${query}":\n\n${resultsText}`
          }
        ]
      };
    } catch (error) {
      console.error("Judokon search failed:", error);
      return {
        content: [
          {
            type: "text",
            text: `Search failed: ${error.message || error}`
          }
        ],
        isError: true
      };
    }
  }

  if (name === "judokon.getById") {
    const { id } = args;

    if (id === undefined || id === null) {
      throw new Error("ID parameter is required");
    }

    try {
      const result = await handleJudokonGetById(id);

      if (!result.found) {
        return {
          content: [
            {
              type: "text",
              text: `Judoka not found with ID: ${result.id}`
            }
          ]
        };
      }

      const {
        name,
        rarity,
        country,
        weightClass,
        stats,
        bio,
        category,
        gender,
        profileUrl,
        cardCode
      } = result;

      const statsText =
        stats && Object.values(stats).some((v) => v > 0)
          ? `Power=${stats.power}, Speed=${stats.speed}, Technique=${stats.technique}, Kumikata=${stats.kumikata}, Newaza=${stats.newaza}`
          : "Stats not available";

      const bioText = bio ? `\n\n${bio}` : "";
      const profileLink = profileUrl ? `\n[Full Profile](${profileUrl})` : "";

      return {
        content: [
          {
            type: "text",
            text:
              `**${name}** (${rarity})\n\n` +
              `Country: ${country}\n` +
              `Weight Class: ${weightClass}\n` +
              `Gender: ${gender}\n` +
              `Category: ${category}\n` +
              `Stats: ${statsText}\n` +
              `Card Code: ${cardCode}` +
              bioText +
              profileLink
          }
        ]
      };
    } catch (error) {
      console.error("Judokon getById failed:", error);
      return {
        content: [
          {
            type: "text",
            text: `Lookup failed: ${error.message || error}`
          }
        ],
        isError: true
      };
    }
  }

  if (name === "judokon.random") {
    const { filters = {} } = args;

    try {
      const validatedFilters = validateRandomFilters(filters);
      const selectedJudoka = selectRandomJudoka(judokaData, validatedFilters);

      if (!selectedJudoka) {
        const filterText =
          Object.keys(validatedFilters).length > 0
            ? ` matching filters: ${JSON.stringify(validatedFilters)}`
            : "";
        return {
          content: [
            {
              type: "text",
              text: `No judoka found${filterText}`
            }
          ]
        };
      }

      const { firstname, surname, country, rarity, weightClass, stats, bio, gender, cardCode } =
        selectedJudoka;

      const statsText =
        stats && Object.values(stats).some((v) => v > 0)
          ? `Power=${stats.power}, Speed=${stats.speed}, Technique=${stats.technique}, Kumikata=${stats.kumikata}, Newaza=${stats.newaza}`
          : "Stats not available";

      const bioText = bio ? `\n\n${bio}` : "";
      const filterSummary =
        Object.keys(validatedFilters).length > 0
          ? `\n(Selected with filters: ${JSON.stringify(validatedFilters)})`
          : "\n(Randomly selected from all judoka)";

      return {
        content: [
          {
            type: "text",
            text:
              `**${firstname} ${surname}** (${rarity})${filterSummary}\n\n` +
              `Country: ${country}\n` +
              `Weight Class: ${weightClass}\n` +
              `Gender: ${gender}\n` +
              `Stats: ${statsText}\n` +
              `Card Code: ${cardCode}` +
              bioText
          }
        ]
      };
    } catch (error) {
      console.error("Judokon random failed:", error);
      return {
        content: [
          {
            type: "text",
            text: `Random selection failed: ${error.message || error}`
          }
        ],
        isError: true
      };
    }
  }

  if (name === "judokon.compare") {
    const { id1, id2 } = args;

    try {
      // Validate comparison IDs
      const idsValid = validateComparisonIds(id1, id2);
      if (!idsValid.valid) {
        return {
          content: [
            {
              type: "text",
              text: `Comparison failed: ${idsValid.error}`
            }
          ],
          isError: true
        };
      }

      // Find judoka records
      const judoka1 = judokaData.find((j) => j.id === Number(id1));
      const judoka2 = judokaData.find((j) => j.id === Number(id2));

      // Validate judoka exist and have stats
      const recordsValid = validateJudokaForComparison(judoka1, judoka2);
      if (!recordsValid.valid) {
        return {
          content: [
            {
              type: "text",
              text: `Comparison failed: ${recordsValid.error}`
            }
          ],
          isError: true
        };
      }

      // Generate comparison report
      const report = formatComparisonReport(judoka1, judoka2);

      // Format output text
      const rankedDiffsText = report.rankedDifferences
        .slice(0, 3)
        .map((rd) => `${rd.stat}: ${rd.difference > 0 ? "+" : ""}${rd.difference}`)
        .join(", ");

      const advantagesText = report.summary.advantages.join(", ") || "None";
      const disadvantagesText = report.summary.disadvantages.join(", ") || "None";

      return {
        content: [
          {
            type: "text",
            text:
              `**${report.title}**\n\n` +
              `${report.judoka1Info}\n` +
              `vs\n` +
              `${report.judoka2Info}\n\n` +
              `**Verdict**: ${report.comparisonText}\n` +
              `**Margin**: ${report.summary.margin} total stats\n` +
              `**Stats**: ${report.summary.judoka1Total} vs ${report.summary.judoka2Total}\n\n` +
              `**Top Differences**: ${rankedDiffsText}\n` +
              `**${report.judoka1Info.split(" (")[0]} Advantages**: ${advantagesText}\n` +
              `**${report.judoka1Info.split(" (")[0]} Disadvantages**: ${disadvantagesText}\n\n` +
              `**Stat-by-Stat**:\n${Object.entries(report.statDetails)
                .map(([stat, detail]) => `• ${stat}: ${detail}`)
                .join("\n")}`
          }
        ]
      };
    } catch (error) {
      console.error("Judokon compare failed:", error);
      return {
        content: [
          {
            type: "text",
            text: `Comparison failed: ${error.message || error}`
          }
        ],
        isError: true
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("JU-DO-KON! MCP server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
