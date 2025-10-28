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
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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
