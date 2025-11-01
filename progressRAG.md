
Observation: You can wrap your local RAG (e.g., `client_embeddings.json`, `judoka.json`, `synonyms.json`) as a **local MCP server** so any MCP-aware agent (e.g., Claude Desktop, other MCP runtimes) can call a `search` tool and get back ranked cards/snippets.

Here’s a minimal, practical blueprint tailored to JU-DO-KON!:

# What you’ll expose to the agent

* **Tools**

  * `judokon.search` → semantic search over your embeddings (`query`, `topK`, optional filters like `country`, `rarity`, `weightClass`).
  * `judokon.getById` → fetch the full judoka record by `id`.
  * (Optional) `judokon.random`, `judokon.resolveCode` for your custom card codes.
* **Resources** (read-only)

  * `judoka.json` (full roster)
  * `client_embeddings.json` (vectors + ids + text chunks)
  * `synonyms.json` (used to expand queries)

# Suggested data shape (fits your repo)

* `client_embeddings.json`:

  ```json
  {
    "model": "MiniLM-L6-v2",
    "dim": 384,
    "items": [
      {"id":"ABEGENENOU_63","text":"...", "embedding":[0.02, -0.11, ...]},
      ...
    ]
  }
  ```
* `judoka.json`: your canonical card data keyed by `id`.

# TypeScript MCP server (drop-in example)

> Directory: `tools/judokon-mcp/`

`package.json`

```json
{
  "name": "judokon-mcp",
  "type": "module",
  "private": true,
  "bin": { "judokon-mcp": "dist/index.js" },
  "scripts": { "build": "tsc -p tsconfig.json", "start": "node dist/index.js" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "fastest-levenshtein": "^1.0.16"
  },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

`tsconfig.json`

```json
{
  "compilerOptions": { "target": "ES2022", "module": "ES2022", "moduleResolution": "Bundler", "outDir": "dist", "strict": true },
  "include": ["src"]
}
```

`src/index.ts`

```ts
import { Server, Tool, ListResourcesResult, CallToolResult } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs";
import path from "node:path";

type EmbItem = { id: string; text: string; embedding: number[]; };
type EmbFile = { model: string; dim: number; items: EmbItem[]; };
type Judoka = { id: string; name: string; country?: string; rarity?: "Common"|"Epic"|"Legendary"; weightClass?: number; [k: string]: any };

function loadJSON<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function norm(vec: number[]) { return Math.sqrt(vec.reduce((s,v)=>s+v*v,0)); }
function cosine(a: number[], b: number[]) {
  let dot = 0; for (let i=0;i<a.length;i++) dot += a[i]*b[i];
  return dot / (norm(a) * norm(b) + 1e-12);
}

// Very small, local embedder shim — replace with your own embedder if you have it.
// Here we do a hacky bag-of-words projection so the server is usable offline.
// For best results, precompute a query encoder the same way you encoded docs.
function pseudoEmbed(text: string, dim: number) {
  const v = new Array(dim).fill(0);
  for (const ch of text.toLowerCase()) v[(ch.codePointAt(0) ?? 0) % dim] += 1;
  const n = norm(v); if (n>0) for (let i=0;i<dim;i++) v[i] /= n;
  return v;
}

const DATA_DIR = process.env.JUDOKON_DATA_DIR ?? path.resolve(process.cwd(), "../../src/data");
const embeddingsPath = path.join(DATA_DIR, "client_embeddings.json");
const judokaPath     = path.join(DATA_DIR, "judoka.json");
const synonymsPath   = path.join(DATA_DIR, "synonyms.json");

const emb: EmbFile = loadJSON<EmbFile>(embeddingsPath);
const judokaList: Judoka[] = loadJSON<Judoka[]>(judokaPath);
const synonymMap: Record<string,string[]> = fs.existsSync(synonymsPath) ? loadJSON(synonymsPath) : {};

const byId = new Map(judokaList.map(j => [j.id, j]));

function expandQuery(q: string) {
  const terms = q.split(/\s+/);
  const expanded = new Set<string>([q]);
  for (const t of terms) {
    (synonymMap[t.toLowerCase()] ?? []).forEach(s => expanded.add(s));
  }
  return Array.from(expanded).join(" ");
}

const server = new Server(
  {
    name: "judokon-mcp",
    version: "1.0.0",
    description: "Local MCP server exposing JU-DO-KON! RAG search over judoka."
  },
  new StdioServerTransport()
);

// Resources (so agents can “see” your datasets)
server.setListResourcesHandler(async (): Promise<ListResourcesResult> => ({
  resources: [
    { uri: `file://${embeddingsPath}`, name: "client_embeddings.json", mimeType: "application/json" },
    { uri: `file://${judokaPath}`,     name: "judoka.json",           mimeType: "application/json" },
    { uri: `file://${synonymsPath}`,   name: "synonyms.json",         mimeType: "application/json" }
  ].filter(r => fs.existsSync(new URL(r.uri)))
}));

// Tools
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
          rarity: { type: "string", enum: ["Common","Epic","Legendary"] },
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

    // Score against embeddings
    const scored = emb.items.map(it => ({ it, score: cosine(qVec, it.embedding) }))
      .sort((a,b) => b.score - a.score);

    // Project to judoka, apply filters, dedupe by id
    const seen = new Set<string>();
    const results: any[] = [];
    for (const {it, score} of scored) {
      if (seen.has(it.id)) continue;
      const j = byId.get(it.id);
      if (!j) continue;
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

Build & run:

```bash
cd tools/judokon-mcp
npm i
npm run build
judokon-mcp
```

# Wire it into an agent (example: Claude Desktop)

Add to your desktop config:

```json
{
  "mcpServers": {
    "judokon": {
      "command": "judokon-mcp",
      "env": { "JUDOKON_DATA_DIR": "/absolute/path/to/your/repo/src/data" }
    }
  }
}
```

Restart the client; you’ll see a `judokon` tool with `judokon.search` and `judokon.getById`.

# How your agent will use it (prompt snippets)

* “Use `judokon.search` for semantic retrieval; then call `judokon.getById` on top hits to enrich answers.”
* “Prefer `filters` to keep results on-topic (e.g., `country: 'FRA'`, `rarity: 'Legendary'`).”
* “Return the **card id, name, country, rarity, weight class, and a 1-2 sentence rationale** for each pick.”

# Notes & options

* **Query encoder**: the stub above will work, but for best quality use the *same* encoder you used for `client_embeddings.json`. Drop it into `pseudoEmbed()` (e.g., a tiny local ONNX model) or precompute a lightweight query-embedding service and call it locally.
* **Speed**: With ~10k items you’re fine scanning in memory. If you grow, swap to an ANN library (e.g., HNSW) or LanceDB/SQLite-VSS.
* **Security**: This server is local (stdio transport). No network I/O unless you add it.
* **JU-DO-KON! niceties**: you can add tools like `judokon.resolveCode({ code })` that map your human-readable custom codes to a judoka `id`, or `judokon.browse({ offset, limit })` for paging.
