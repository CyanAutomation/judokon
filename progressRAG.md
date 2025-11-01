# Local RAG MCP Server Blueprint

This document outlines a blueprint for wrapping the JU-DO-KON! RAG data into a local Model Context Protocol (MCP) server. This allows any MCP-aware agent to perform semantic searches over the project's data, such as judoka profiles and embeddings.

## 1. Executive Summary

The core idea is to expose our RAG capabilities (e.g., `client_embeddings.json`, `judoka.json`) through a standardized local server. An AI agent can then connect to this server and use dedicated tools for searching and retrieving information, making the system more modular and accessible.

## 2. Proposed Architecture

The MCP server will expose the following tools and resources to a connected agent.

### Tools

-   `judokon.search`: Performs semantic search over the judoka embeddings. It accepts a `query`, `topK`, and optional `filters` (e.g., `country`, `rarity`).
-   `judokon.getById`: Fetches the complete record for a judoka by their unique `id`.
-   *(Optional)*: Additional tools like `judokon.random` or `judokon.resolveCode` can be added for enhanced functionality.

### Resources

The agent will have read-only access to the core data files:

-   `judoka.json`: The canonical database of all judoka.
-   `client_embeddings.json`: Contains the vector embeddings and text chunks for search.
-   `synonyms.json`: Used for query expansion to improve search results.

## 3. Data Schema

The server will rely on the existing data structures within the project.

-   **`client_embeddings.json`**:
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
-   **`judoka.json`**: The existing array of judoka objects, keyed by `id`.

## 4. Implementation Blueprint

Here is a reference implementation for the MCP server using TypeScript.

**Directory**: `tools/judokon-mcp/`

### `package.json`

```json
{
  "name": "judokon-mcp",
  "type": "module",
  "private": true,
  "bin": {
    "judokon-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "fastest-levenshtein": "^1.0.16"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true
  },
  "include": ["src"]
}
```

### `src/index.ts`

```typescript
import { Server, Tool, ListResourcesResult, CallToolResult } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs";
import path from "node:path";

// --- Type Definitions ---
type EmbItem = { id: string; text: string; embedding: number[]; };
type EmbFile = { model: string; dim: number; items: EmbItem[]; };
type Judoka = { id: string; name: string; country?: string; rarity?: "Common"|"Epic"|"Legendary"; weightClass?: number; [k: string]: any };

// --- Utility Functions ---
function loadJSON<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function norm(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot / (norm(a) * norm(b) + 1e-12);
}

// A simplified local embedder. For best results, replace this with the actual
// query encoder model used to generate the document embeddings.
function pseudoEmbed(text: string, dim: number): number[] {
  const v = new Array(dim).fill(0);
  for (const ch of text.toLowerCase()) {
    v[(ch.codePointAt(0) ?? 0) % dim] += 1;
  }
  const n = norm(v);
  if (n > 0) {
    for (let i = 0; i < dim; i++) {
      v[i] /= n;
    }
  }
  return v;
}

// --- Data Loading ---
const DATA_DIR = process.env.JUDOKON_DATA_DIR ?? path.resolve(process.cwd(), "../../src/data");
const embeddingsPath = path.join(DATA_DIR, "client_embeddings.json");
const judokaPath = path.join(DATA_DIR, "judoka.json");
const synonymsPath = path.join(DATA_DIR, "synonyms.json");

const emb: EmbFile = loadJSON<EmbFile>(embeddingsPath);
const judokaList: Judoka[] = loadJSON<Judoka[]>(judokaPath);
const synonymMap: Record<string, string[]> = fs.existsSync(synonymsPath) ? loadJSON(synonymsPath) : {};
const byId = new Map(judokaList.map(j => [j.id, j]));

function expandQuery(q: string): string {
  const terms = q.split(/\s+/);
  const expanded = new Set<string>([q]);
  for (const t of terms) {
    (synonymMap[t.toLowerCase()] ?? []).forEach(s => expanded.add(s));
  }
  return Array.from(expanded).join(" ");
}

// --- Server Initialization ---
const server = new Server(
  {
    name: "judokon-mcp",
    version: "1.0.0",
    description: "Local MCP server exposing JU-DO-KON! RAG search over judoka."
  },
  new StdioServerTransport()
);

// --- Resource Handler ---
server.setListResourcesHandler(async (): Promise<ListResourcesResult> => ({
  resources: [
    { uri: `file://${embeddingsPath}`, name: "client_embeddings.json", mimeType: "application/json" },
    { uri: `file://${judokaPath}`,     name: "judoka.json",           mimeType: "application/json" },
    { uri: `file://${synonymsPath}`,   name: "synonyms.json",         mimeType: "application/json" }
  ].filter(r => fs.existsSync(new URL(r.uri)))
}));

// --- Tool Definitions ---
const searchTool: Tool = {
  name: "judokon.search",
  description: "Semantic search over JU-DO-KON! embeddings.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      topK: { type: "integer", minimum: 1, maximum: 50, default: 8 },
      filters: {
        type: "object",
        properties: {
          country: { type: "string" },
          rarity: { type: "string", enum: ["Common", "Epic", "Legendary"] },
          weightClass: { type: "number" }
        }
      }
    },
    required: ["query"]
  },
  handler: async (args): Promise<CallToolResult> => {
    const { query, topK = 8, filters = {} } = args as any;
    const q = expandQuery(query);
    const qVec = pseudoEmbed(q, emb.dim);

    // 1. Score all items against the query vector
    const scored = emb.items.map(it => ({ it, score: cosine(qVec, it.embedding) }))
      .sort((a, b) => b.score - a.score);

    // 2. Project to judoka, apply filters, and deduplicate
    const seen = new Set<string>();
    const results: any[] = [];
    for (const { it, score } of scored) {
      if (seen.has(it.id)) continue;
      const j = byId.get(it.id);
      if (!j) continue;

      // Apply filters
      if (filters.country && j.country !== filters.country) continue;
      if (filters.rarity && j.rarity !== filters.rarity) continue;
      if (filters.weightClass && j.weightClass !== filters.weightClass) continue;

      results.push({
        id: it.id,
        name: j.name,
        country: j.country,
        rarity: j.rarity,
        weightClass: j.weightClass,
        text: it.text,
        score
      });
      seen.add(it.id);
      if (results.length >= topK) break;
    }

    return { content: [{ type: "json", text: JSON.stringify({ query, results }, null, 2) }] };
  }
};

const getByIdTool: Tool = {
  name: "judokon.getById",
  description: "Fetch full judoka record by id.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"]
  },
  handler: async (args): Promise<CallToolResult> => {
    const { id } = args as any;
    const j = byId.get(id);
    if (!j) return { content: [{ type: "text", text: `Not found: ${id}` }] };
    return { content: [{ type: "json", text: JSON.stringify(j, null, 2) }] };
  }
};

server.setTools([searchTool, getByIdTool]);
server.start();
```

## 5. Setup and Deployment

To run the server, navigate to the `tools/judokon-mcp` directory and execute the following commands:

```bash
# 1. Install dependencies
npm install

# 2. Build the TypeScript source
npm run build

# 3. Start the server
judokon-mcp
```

## 6. Agent Integration

To integrate this server with an MCP-aware agent (e.g., Claude Desktop), add the following to your client's configuration:

```json
{
  "mcpServers": {
    "judokon": {
      "command": "judokon-mcp",
      "env": {
        "JUDOKON_DATA_DIR": "/absolute/path/to/your/repo/src/data"
      }
    }
  }
}
```

After restarting the client, the `judokon.search` and `judokon.getById` tools will be available.

### Example Agent Instructions

-   "Use `judokon.search` for semantic retrieval; then call `judokon.getById` on top hits to enrich answers."
-   "Prefer `filters` to keep results on-topic (e.g., `country: 'FRA'`, `rarity: 'Legendary'`)."
-   "Return the **card id, name, country, rarity, weight class, and a 1-2 sentence rationale** for each pick."

## 7. Advanced Considerations

-   **Query Encoder**: The `pseudoEmbed` function is a placeholder. For production-quality results, replace it with the *same* encoder model used to generate `client_embeddings.json`.
-   **Performance**: For larger datasets (~10k+ items), consider replacing the in-memory search with a dedicated Approximate Nearest Neighbor (ANN) library like HNSWlib, or a vector database like LanceDB/SQLite-VSS.
-   **Security**: The server uses a `StdioServerTransport`, meaning it only communicates over standard I/O and does not open any network ports.
-   **Extensibility**: You can easily add more JU-DO-KON-specific tools, such as `judokon.resolveCode({ code })` to map custom codes to a judoka `id`.