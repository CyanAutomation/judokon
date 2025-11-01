# Local RAG MCP Server Blueprint

This document outlines the architecture and implementation plan for wrapping JU-DO-KON!'s RAG (Retrieval-Augmented Generation) capabilities into a local Model Context Protocol (MCP) server. This enables MCP-aware agents (e.g., Claude Desktop, GitHub Copilot) to perform semantic searches over project documentation, code patterns, and game data through a standardized interface.

## 1. Executive Summary

**Current Status**: ✅ **Partially Implemented**

The JU-DO-KON! project already has a working MCP RAG server (`scripts/mcp-rag-server.mjs`) that exposes the `query_rag` tool. The core idea is to expand this capability to expose additional judoka-specific tools (search, getById, filters) while maintaining the existing RAG query infrastructure.

**Key Benefits**:

- 📡 **Standardized Interface**: MCP-compliant agents can access RAG without custom integrations
- 🔍 **Semantic Search**: Natural language queries over vector embeddings
- 🎯 **Modular Architecture**: Separate concerns between data, embeddings, and query logic
- 🔐 **Local-First**: Uses `StdioServerTransport` for secure, process-based communication (no network exposure)

## 2. Proposed Architecture

The MCP server will expose the following tools and resources to a connected agent.

### Tools

- `query_rag`: ✅ **Already Implemented** — Performs semantic search over the RAG vector database. Accepts a `query` string and returns ranked results from documentation and code patterns.

- `judokon.search`: 📋 **Proposed** — Specialized semantic search over judoka embeddings. Accepts a `query`, `topK` limit, and optional `filters` (e.g., `country`, `rarity`, `weightClass`).

- `judokon.getById`: 📋 **Proposed** — Fetches the complete record for a judoka by their unique `id`.

- _(Optional)_: Additional tools like `judokon.random` (random judoka selection) or `judokon.resolveCode` (map card codes to judoka IDs) can be added for enhanced functionality.

### Resources

The agent will have read-only access to core data files:

- `judoka.json` — The canonical database of all judoka records with stats, bios, and metadata
- `client_embeddings.json` — Vector embeddings and text chunks for semantic search
- `synonyms.json` — Query expansion terms for improved search relevance
- Offline RAG vectors — `offline_rag_vectors.bin` and `offline_rag_metadata.json` for local inference

## 3. Data Schema

The server relies on existing data structures within the project.

### `client_embeddings.json`

Contains vector embeddings and text chunks for semantic search:

```json
{
  "model": "MiniLM-L6-v2",
  "dim": 384,
  "items": [
    {
      "id": "ABEGENENOU_63",
      "text": "...",
      "embedding": [0.02, -0.11, ...]
    }
  ]
}
```

### `judoka.json`

The canonical database array of judoka objects with the following structure:

```json
{
  "id": 0,
  "firstname": "Tatsuuma",
  "surname": "Ushiyama",
  "country": "Vanuatu",
  "countryCode": "vu",
  "weightClass": "+100",
  "rarity": "Legendary",
  "stats": {
    "power": 9,
    "speed": 9,
    "technique": 9,
    "kumikata": 9,
    "newaza": 9
  },
  "bio": "...",
  "gender": "male",
  "cardCode": "VZL6-J823-2DQ7-EB57-..."
}
```

### `synonyms.json`

Maps query terms to synonym expansions for improved search relevance:

```json
{
  "power": ["strength", "force"],
  "speed": ["quickness", "agility"],
  "japan": ["nippon", "japanese"]
}
```

## 4. Current Implementation Status

### ✅ Already Implemented: `scripts/mcp-rag-server.mjs`

The project includes a working MCP RAG server at `scripts/mcp-rag-server.mjs` that:

- Exposes the `query_rag` tool for semantic search over the vector database
- Integrates with the existing `queryRag` helper function
- Supports offline mode with local MiniLM model
- Provides helpful error messages with setup hints
- Can be started via: `npm run rag:mcp`

**Key Features**:

- Uses `StdioServerTransport` for secure, process-based communication
- Returns ranked results with relevance scores
- Handles network errors gracefully with fallback guidance
- Supports offline-only mode via `RAG_STRICT_OFFLINE=1`

### 📋 Proposed Enhancement: Judoka-Specific Tools

To extend the MCP server with judoka-specific search capabilities, add:

#### Tool: `judokon.search`

**Purpose**: Semantic search over judoka embeddings with filtering

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query (e.g., 'powerful judoka from Japan')"
    },
    "topK": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "default": 8,
      "description": "Maximum results to return"
    },
    "filters": {
      "type": "object",
      "description": "Optional filters to narrow results",
      "properties": {
        "country": { "type": "string" },
        "rarity": { "enum": ["Common", "Epic", "Legendary"] },
        "weightClass": { "type": "string" }
      }
    }
  },
  "required": ["query"]
}
```

#### Tool: `judokon.getById`

**Purpose**: Fetch full judoka record by ID

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Judoka ID (e.g., 'ABEGENENOU_63' or numeric ID)"
    }
  },
  "required": ["id"]
}
```

## 5. Reference Implementation

This reference implementation extends the existing server with judoka-specific tools.

### `package.json`

```json
{
  "name": "judokon",
  "scripts": {
    "rag:mcp": "node --max-old-space-size=4096 scripts/mcp-rag-server.mjs",
    "rag:query": "node scripts/queryRagCli.mjs",
    "rag:validate": "node scripts/checkRagPreflight.mjs && node scripts/evaluation/evaluateRAG.js",
    "rag:prepare:models": "node scripts/prepareLocalModel.mjs",
    "rag:health": "node scripts/ragHealth.mjs",
    "check:rag": "node scripts/checkRagModel.mjs"
  }
}
```

### `scripts/mcp-rag-server.mjs` (Existing Implementation)

The server is already implemented and can be extended with judoka-specific tools:

```javascript
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
        description: "Query the JU-DO-KON! vector database for documentation and code patterns",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to find relevant information"
            }
          },
          required: ["query"]
        }
      },
      // NEW: judokon.search tool
      {
        name: "judokon.search",
        description: "Semantic search over judoka embeddings with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            topK: { type: "integer", minimum: 1, maximum: 50, default: 8 },
            filters: {
              type: "object",
              properties: {
                country: { type: "string" },
                rarity: { enum: ["Common", "Epic", "Legendary"] },
                weightClass: { type: "string" }
              }
            }
          },
          required: ["query"]
        }
      },
      // NEW: judokon.getById tool
      {
        name: "judokon.getById",
        description: "Fetch full judoka record by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" }
          },
          required: ["id"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "query_rag") {
    // Existing RAG query implementation
    const query = args.query;
    const matches = await queryRag(query);
    // ... format and return results
  }

  if (name === "judokon.search") {
    // NEW: Judoka-specific search implementation
    const { query, topK = 8, filters = {} } = args;
    // ... perform semantic search with filters
  }

  if (name === "judokon.getById") {
    // NEW: Fetch judoka by ID
    const { id } = args;
    // ... look up judoka in judoka.json
  }
});

server.start();
```

### Judoka Search Implementation Details

```javascript
import fs from "node:fs";
import path from "node:path";

// Load data files
const judokaList = JSON.parse(fs.readFileSync("src/data/judoka.json", "utf8"));
const embeddings = JSON.parse(fs.readFileSync("src/data/client_embeddings.json", "utf8"));
const byId = new Map(judokaList.map((j) => [j.id, j]));

// Cosine similarity
function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  const aMag = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const bMag = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (aMag * bMag + 1e-12);
}

// Search handler
async function handleJudokonSearch(query, topK = 8, filters = {}) {
  // Use queryRag or local embeddings for query encoding
  const queryEmbedding = await encodeQuery(query);

  // Score all items
  const scored = embeddings.items
    .map((item) => ({
      item,
      score: cosine(queryEmbedding, item.embedding)
    }))
    .sort((a, b) => b.score - a.score);

  // Apply filters and return top results
  const results = [];
  const seen = new Set();

  for (const { item, score } of scored) {
    if (seen.has(item.id)) continue;

    const judoka = byId.get(item.id);
    if (!judoka) continue;

    // Apply filters
    if (filters.country && judoka.country !== filters.country) continue;
    if (filters.rarity && judoka.rarity !== filters.rarity) continue;
    if (filters.weightClass && judoka.weightClass !== filters.weightClass) continue;

    results.push({
      id: judoka.id,
      name: `${judoka.firstname} ${judoka.surname}`,
      country: judoka.country,
      rarity: judoka.rarity,
      weightClass: judoka.weightClass,
      stats: judoka.stats,
      score
    });

    if (results.length >= topK) break;
  }

  return results;
}
```

## 6. Setup and Deployment

### Starting the Existing MCP Server

To run the already-implemented RAG MCP server:

```shell
# Start the MCP server
npm run rag:mcp

# The server will listen on stdio for MCP client connections
```

### Extending with Judoka-Specific Tools

To add the proposed judoka search tools:

1. **Edit** `scripts/mcp-rag-server.mjs` to include the new tool definitions
2. **Implement** the search handler using the reference code above
3. **Test** with: `npm run rag:mcp`

### Environment Setup

Configure your MCP client (e.g., Claude Desktop) with:

```json
{
  "mcpServers": {
    "judokon-rag": {
      "command": "npm",
      "args": ["run", "rag:mcp"],
      "cwd": "/absolute/path/to/judokon"
    }
  }
}
```

## 7. Agent Integration Examples

### Using with Claude Desktop

After configuring the MCP server in Claude Desktop's `claude_desktop_config.json`:

**Prompt**: "Find the strongest judoka from Japan"

**Result**:

```text
Tool: judokon.search
Query: "strongest judoka from Japan"
Filters: { country: "Japan" }
Top Result: Tatsuuma Ushiyama (Legendary, +100kg, Power: 9)
```

### Agent Instructions

When providing instructions to agents using this MCP server:

- **Search Strategy**: "Use `judokon.search` first with filters for country/rarity, then call `judokon.getById` on top results to get full details"
- **Filtering**: "Apply filters to narrow results: country='Japan', rarity='Legendary', or specific weight classes"
- **Response Format**: "Return judoka ID, full name, country, rarity, weight class, top stats, and a 1-2 sentence summary"

## 8. Implementation Roadmap

### Phase 1: ✅ Validation (Current)

- [x] Verify existing MCP server works
- [x] Audit data schema (judoka.json, embeddings)
- [x] Document current implementation
- [x] Plan judoka-specific tools

### Phase 2: 🚧 Extension

- [ ] Add `judokon.search` tool to MCP server
- [ ] Implement semantic search with filters
- [ ] Add `judokon.getById` tool
- [ ] Create integration tests for new tools
- [ ] Update agent instructions

### Phase 3: 🔮 Optimization (Optional)

- [ ] Add caching for frequent queries
- [ ] Implement query expansion with synonyms
- [ ] Support advanced filters (weight range, stat thresholds)
- [ ] Add `judokon.random` for random judoka selection
- [ ] Add `judokon.resolveCode` for card code lookup

## 9. Advanced Considerations

### Query Encoding

The current implementation uses `queryRag` for query encoding. For optimal performance with judoka-specific searches:

- Use the **same MiniLM-L6-v2 model** that generated `client_embeddings.json`
- Leverage the local model at `models/minilm/` for offline queries
- Falls back to CDN if local model unavailable

### Performance at Scale

The JU-DO-KON! dataset includes 200+ judoka records. For larger datasets:

- Current in-memory search is adequate (O(n) complexity acceptable)
- Consider ANN libraries (HNSWlib, FAISS) if scaling beyond 10k+ items
- Monitor filter efficiency (country, rarity filters are fast on indexed data)

### Security Architecture

- **Transport**: `StdioServerTransport` provides secure process-based communication
- **Network**: No open network ports; runs as a subprocess of the MCP client
- **Data Access**: Read-only access to data files; no modifications possible through tools
- **Isolation**: Each MCP client gets its own server process

### Extensibility

Additional tools that could be added:

- **`judokon.random`**: Select random judoka with optional filters
- **`judokon.resolveCode`**: Map card codes to judoka records
- **`judokon.compare`**: Compare stats between two judoka
- **`judokon.suggestOpponent`**: Recommend opponent based on current judoka
- **`judokon.listCountries`**: Get list of countries in database
- **`judokon.validateCardCode`**: Verify card code format and existence

## 10. Testing Strategy

### Unit Tests

```javascript
// Test judokon.search with filters
test("judokon.search filters by country", async () => {
  const results = await handler.judokonSearch("powerful judoka", 10, { country: "Japan" });
  assert(results.every((j) => j.country === "Japan"));
});

// Test getById
test("judokon.getById returns full record", async () => {
  const result = await handler.judokonGetById(0);
  assert(result.firstname && result.stats && result.country);
});
```

### Integration Tests

- Test MCP server startup and tool discovery
- Verify query results match embedding similarities
- Validate filter application (country, rarity, weight)
- Test offline mode with local model

### End-to-End Tests

- Test MCP client connection and tool execution
- Verify results from Claude Desktop integration
- Benchmark query latency and accuracy
- Test fallback behavior when model unavailable
