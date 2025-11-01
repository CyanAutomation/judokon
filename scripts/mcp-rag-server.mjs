#!/usr/bin/env node

/**
 * MCP server for RAG queries in JU-DO-KON!
 *
 * This server provides access to the vector database for querying documentation
 * and code patterns using the queryRag function.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import queryRag from "../src/helpers/queryRag.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ Utility Functions ============

/**
 * Compute vector norm (magnitude)
 * @param {number[]} vec
 * @returns {number}
 */
function norm(vec) {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 * @deprecated Not used in v1, reserved for future enhancements
 */
// eslint-disable-next-line no-unused-vars
function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  const aMag = norm(a);
  const bMag = norm(b);
  return dot / (aMag * bMag + 1e-12);
}

// ============ Data Loading ============

// Load judoka data
const judokaPath = path.join(__dirname, "../src/data/judoka.json");
const judokaData = JSON.parse(fs.readFileSync(judokaPath, "utf8"));
const judokaById = new Map(judokaData.map((j) => [String(j.id), j]));

// Load embeddings (stored as array of {id, text, embedding} objects)
const embeddingsPath = path.join(__dirname, "../src/data/client_embeddings.json");
const embeddingsArray = JSON.parse(fs.readFileSync(embeddingsPath, "utf8"));

// Create embeddings map for quick lookup (reserved for future use)
// eslint-disable-next-line no-unused-vars
const embeddingsById = new Map(embeddingsArray.map((e) => [e.id, e]));

console.error(`Loaded ${judokaData.length} judoka records`);
console.error(`Loaded ${embeddingsArray.length} embeddings`);

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
        name: "query_rag",
        description:
          "Query the JU-DO-KON! vector database for documentation, code patterns, and project information",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The search query to find relevant information in the codebase and documentation"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "judokon.search",
        description:
          "Semantic search over judoka embeddings with optional filtering by country, rarity, or weight class",
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
async function handleJudokonSearch(query, topK = 8, filters = {}) {
  // Use queryRag to encode the query into the embedding space
  const ragResults = await queryRag(query);

  if (!ragResults || ragResults.length === 0) {
    return { results: [], query, message: "No results found for query" };
  }

  // Extract IDs from RAG results and create a score map
  const scoreMap = new Map();
  ragResults.slice(0, 10).forEach((result, index) => {
    // Extract ID from the text or source
    scoreMap.set(result.id || String(index), (10 - index) / 10);
  });

  // Find judoka matching the RAG results and apply filters
  const candidates = [];

  for (const embedding of embeddingsArray) {
    const judoka = judokaById.get(embedding.id) || judokaById.get(String(embedding.id));
    if (!judoka) continue;

    // Apply filters
    if (filters.country && judoka.country !== filters.country) continue;
    if (filters.rarity && judoka.rarity !== filters.rarity) continue;
    if (filters.weightClass && judoka.weightClass !== filters.weightClass) continue;

    // Calculate relevance score
    const ragScore = scoreMap.get(embedding.id) || 0;
    candidates.push({
      id: judoka.id,
      name: `${judoka.firstname} ${judoka.surname}`,
      country: judoka.country,
      countryCode: judoka.countryCode,
      rarity: judoka.rarity,
      weightClass: judoka.weightClass,
      stats: judoka.stats,
      bio: judoka.bio,
      score: ragScore,
      text: embedding.text
    });
  }

  // Sort by score descending and limit to topK
  const results = candidates.sort((a, b) => b.score - a.score).slice(0, topK);

  return {
    results,
    query,
    topK,
    filters: Object.keys(filters).length > 0 ? filters : null,
    count: results.length
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
      const searchResults = await handleJudokonSearch(query, topK, filters);

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
            text: `**${name}** (${rarity})\n\n` +
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

  if (name === "query_rag") {
    const query = args.query;
    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required and must be a string");
    }

    try {
      const matches = await queryRag(query);

      if (!matches || matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No matches found for the query."
            }
          ]
        };
      }

      const results = matches
        .map((match, index) => {
          const { qaContext, text, score, source } = match;
          return `**Result ${index + 1}:**\n${qaContext || text || "(no summary)"}\n*Source: ${source || "unknown"}*\n*Score: ${score?.toFixed(3) || "N/A"}*\n`;
        })
        .join("\n---\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${matches.length} matches for "${query}":\n\n${results}`
          }
        ]
      };
    } catch (error) {
      console.error("RAG query failed:", error);
      const errorMessage = String(error?.message || error).toLowerCase();

      let hint = "";
      if (errorMessage.includes("strict offline mode")) {
        hint = "Hint: Provide a local MiniLM at models/minilm or run: npm run rag:prepare:models";
      } else if (
        /enet(?:unreach|down|reset|refused)/i.test(errorMessage) ||
        errorMessage.includes("fetch failed")
      ) {
        hint =
          "Hint: Network unreachable. For offline use, run: npm run rag:prepare:models -- --from-dir <path-with-minilm> or set RAG_STRICT_OFFLINE=1";
      }

      return {
        content: [
          {
            type: "text",
            text: `RAG query failed: ${error.message || error}\n${hint}`
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
  console.error("JU-DO-KON! RAG MCP server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
