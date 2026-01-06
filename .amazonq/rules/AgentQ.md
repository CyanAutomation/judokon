# 🤖 JU-DO-KON! Agent Guide

**Purpose**: Define deterministic rules, workflows, and safety requirements for AI Agents operating in the JU-DO-KON! repository.

> **Note**: This is the authoritative agent guide. For general development setup, see [CONTRIBUTING.md](./CONTRIBUTING.md). For human-readable documentation, see [README.md](./README.md).
>
> **File Relationship**: This file (`AGENTS.md`) is the primary agent guide. The file `.github/copilot-instructions.md` contains Copilot-specific instructions and references this document. Both serve the same core purpose—use whichever is most accessible for your workflow.

## 🎯 Quick Reference Cards

### 🔍 Context Acquisition

```bash
# Start with RAG for any question
queryRag("How does the battle engine work?")

# Key files to check
src/data/tooltips.json        # Tooltip content
src/data/judoka.json          # Card data
src/config/settingsDefaults.js # Settings source of truth
```

### 📋 Task Contract Template

```json
{
  "inputs": ["src/file.js", "tests/file.test.js"],
  "outputs": ["src/file.js", "tests/file.test.js"],
  "success": [
    "prettier: PASS",
    "eslint: PASS",
    "jsdoc: PASS",
    "vitest: PASS",
    "playwright: PASS",
    "no_unsilenced_console"
  ],
  "errorMode": "ask_on_breaking_change",
  "verificationChecklist": [
    "prettier/eslint/jsdoc PASS",
    "vitest + playwright PASS",
    "no unsuppressed logs",
    "tests: happy + edge",
    "CI green"
  ]
}
```

---

## 🔌 MCP Server Integration Guide

### Overview

The JU-DO-KON! project includes a Model Context Protocol (MCP) server that exposes powerful judoka search and data retrieval tools. This enables MCP-aware agents (Claude Desktop, GitHub Copilot, custom clients) to query the judoka database with semantic search and filtering capabilities.

**Server Location**: `scripts/mcp-rag-server.mjs`  
**Start Command**: `npm run rag:mcp`

### Available Tools

#### 1. `query_rag` — Documentation & Code Pattern Search

Semantic search over the entire JU-DO-KON! vector database including game rules, development standards, and code patterns.

**Usage**:

```javascript
// Search for documentation on battle mechanics
const result = await mcp.call("query_rag", {
  query: "classic battle countdown timer implementation"
});
// Returns: [{ id, text, score, source, tags, ... }, ...]
```

**When to use**: Questions about project architecture, development patterns, game rules, or implementation details.

#### 2. `judokon.search` — Judoka Semantic Search

Search for judoka with optional filtering by country, rarity, or weight class.

**Input Schema**:

```json
{
  "query": "string (required)", // Search query
  "topK": "integer (1-50, default 8)", // Max results
  "filters": {
    "country": "string (optional)", // Filter by country
    "rarity": "enum (Common|Epic|Legendary)",
    "weightClass": "string (optional)" // e.g., '+100', '-60'
  }
}
```

**Examples**:

```javascript
// Find the most powerful judoka
const result1 = await mcp.call("judokon.search", {
  query: "strongest fighter",
  topK: 5
});

// Find legendary judoka from Japan
const result2 = await mcp.call("judokon.search", {
  query: "powerful judoka",
  topK: 10,
  filters: {
    country: "Japan",
    rarity: "Legendary"
  }
});

// Find lightweight specialists
const result3 = await mcp.call("judokon.search", {
  query: "agile speed specialist",
  filters: {
    weightClass: "-60"
  }
});
```

**Response Format**:

```json
{
  "results": [
    {
      "id": 0,
      "name": "Tatsuuma Ushiyama",
      "country": "Vanuatu",
      "countryCode": "vu",
      "rarity": "Legendary",
      "weightClass": "+100",
      "stats": {
        "power": 9,
        "speed": 9,
        "technique": 9,
        "kumikata": 9,
        "newaza": 9
      },
      "bio": "...",
      "score": 0.95
    }
  ],
  "query": "strongest fighter",
  "topK": 5,
  "count": 1
}
```

#### 3. `judokon.getById` — Fetch Judoka Record

Retrieve the complete judoka record by ID.

**Input Schema**:

```json
{
  "id": "string | number (required)" // Judoka ID (numeric or string)
}
```

**Examples**:

```javascript
// Fetch by numeric ID
const result1 = await mcp.call("judokon.getById", {
  id: 42
});

// Fetch by string ID
const result2 = await mcp.call("judokon.getById", {
  id: "42"
});
```

**Response Format (Found)**:

```json
{
  "found": true,
  "id": 42,
  "firstname": "Tatsuuma",
  "surname": "Ushiyama",
  "name": "Tatsuuma Ushiyama",
  "country": "Vanuatu",
  "countryCode": "vu",
  "rarity": "Legendary",
  "weightClass": "+100",
  "gender": "male",
  "category": "...",
  "stats": {
    "power": 9,
    "speed": 9,
    "technique": 9,
    "kumikata": 9,
    "newaza": 9
  },
  "bio": "...",
  "cardCode": "..."
}
```

**Response Format (Not Found)**:

```json
{
  "found": false,
  "id": "999999",
  "message": "Judoka not found"
}
```

#### 4. `judokon.random` — Select Random Judoka

Selects a random judoka (or multiple) with optional filtering by country, rarity, or weight class.

**Input Schema**:

```json
{
  "count": "integer (1-50, default 1)", // Number of random judoka to select
  "filters": {
    "country": "string (optional)", // Filter by country
    "rarity": "enum (Common|Epic|Legendary)",
    "weightClass": "string (optional)" // e.g., '+100', '-60'
  }
}
```

**Examples**:

```javascript
// Select a single random judoka
const result1 = await mcp.call("judokon.random", {});

// Select 3 random legendary judoka from Japan
const result2 = await mcp.call("judokon.random", {
  count: 3,
  filters: {
    country: "Japan",
    rarity: "Legendary"
  }
});
```

**Response Format**: (Same as `judokon.search` for each judoka in an array)

```json
{
  "results": [
    {
      "id": 0,
      "name": "Tatsuuma Ushiyama",
      "country": "Vanuatu",
      "countryCode": "vu",
      "rarity": "Legendary",
      "weightClass": "+100",
      "stats": {
        "power": 9,
        "speed": 9,
        "technique": 9,
        "kumikata": 9,
        "newaza": 9
      },
      "bio": "...",
      "score": 0.95 // Score is not relevant for random, but kept for consistency
    }
  ],
  "count": 1 // Number of random judoka returned
}
```

#### 5. `judokon.compare` — Compare Judoka Stats

Compares the stats between two specified judoka by their IDs.

**Input Schema**:

```json
{
  "judoka1_id": "string | number (required)", // ID of the first judoka
  "judoka2_id": "string | number (required)" // ID of the second judoka
}
```

**Examples**:

```javascript
// Compare judoka with ID 0 and ID 1
const result = await mcp.call("judokon.compare", {
  judoka1_id: 0,
  judoka2_id: 1
});
```

**Response Format**: (Detailed comparison of stats)

```json
{
  "judoka1": {
    "id": 0,
    "name": "Tatsuuma Ushiyama",
    "stats": { "power": 9, "speed": 9, "technique": 9, "kumikata": 9, "newaza": 9 }
  },
  "judoka2": {
    "id": 1,
    "name": "Rina Kobayashi",
    "stats": { "power": 7, "speed": 8, "technique": 6, "kumikata": 7, "newaza": 8 }
  },
  "comparison": {
    "power_diff": 2, // judoka1.power - judoka2.power
    "speed_diff": 1,
    "technique_diff": 3,
    "kumikata_diff": 2,
    "newaza_diff": 1,
    "summary": "Tatsuuma Ushiyama has higher Power, Technique, Kumikata, and Newaza. Rina Kobayashi has higher Speed."
  }
}
```

### Setup Instructions

#### 1. Claude Desktop Integration

Add to your `claude_desktop_config.json`:

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

Then restart Claude Desktop. The tools will be available in the MCP menu.

#### 2. Custom MCP Client

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

// Start the MCP server
const process = spawn("npm", ["run", "rag:mcp"], {
  cwd: "/path/to/judokon"
});

// Connect via stdio
const transport = new StdioClientTransport({
  command: process
});

const client = new Client(
  {
    name: "my-judokon-app",
    version: "1.0.0"
  },
  {
    capabilities: {}
  },
  transport
);

await client.connect();

// Use the tools
const results = await client.callTool("judokon.search", {
  query: "strongest judoka",
  topK: 5
});
```

### Query Patterns & Best Practices

#### Pattern 1: Multi-Step Search + Detail Lookup

```javascript
// First: Search for candidates
const candidates = await mcp.call("judokon.search", {
  query: "fast agile fighter",
  filters: { rarity: "Legendary" },
  topK: 3
});

// Then: Get full details for top result
if (candidates.results.length > 0) {
  const fullRecord = await mcp.call("judokon.getById", {
    id: candidates.results[0].id
  });
  console.log(fullRecord.bio); // Display full biography
}
```

#### Pattern 2: Filtered Search by Criteria

```javascript
// Search with specific filters
const japaneseEpicFighters = await mcp.call("judokon.search", {
  query: "balanced judoka",
  filters: {
    country: "Japan",
    rarity: "Epic"
  },
  topK: 10
});
```

#### Pattern 3: Narrow Search with Weight Class

```javascript
// Find heavy specialists
const heavyweights = await mcp.call("judokon.search", {
  query: "powerful strong judoka",
  filters: {
    weightClass: "+100"
  },
  topK: 8
});

// Compare stats
heavyweights.results.forEach((j) => {
  console.log(`${j.name}: Power=${j.stats.power}, Speed=${j.stats.speed}`);
});
```

### Error Handling

```javascript
try {
  const result = await mcp.call("judokon.search", {
    query: "xyz___invalid",
    topK: 5
  });

  if (result.results.length === 0) {
    console.log("No matches found. Try different keywords or remove filters.");
  }
} catch (error) {
  console.error("MCP Error:", error.message);
  // Gracefully handle connection or parsing errors
}
```

### Performance Considerations

- **Search Latency**: ~100-200ms per query (including RAG encoding)
- **Result Limit**: Maximum 50 results per query (topK parameter)
- **Filter Efficiency**: Filters are applied post-search; use specific keywords for faster results
- **Data Size**: ~5,900 embeddings indexed; in-memory search is O(n) complexity (acceptable for current dataset)

### Debugging

#### Check MCP Server Health

```bash
# Verify the server starts
npm run rag:mcp

# Check for errors in stderr; look for:
# "Loaded X judoka records"
# "Loaded Y embeddings"
```

#### Validate Tool Availability

Once connected, list available tools:

```javascript
const tools = await mcp.listTools();
console.log(tools); // Should show query_rag, judokon.search, judokon.getById
```

#### Test Query

```javascript
// Simple test query
const test = await mcp.call("judokon.getById", { id: 0 });
console.log(test); // Should return first judoka record
```

### Extensibility

Potential future tools that could be added:

- **`judokon.resolveCode`** — Map card codes to judoka records
- **`judokon.listCountries`** — Get list of countries in database
- **`judokon.statsByRarity`** — Analyze stat distributions by rarity level

---

## ✅ Essential Validation

```bash
# Core validation (run before commit)
npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast

# Agent-specific checks
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle && echo "❌ Dynamic import in hot path"
```

### 🚫 Critical Violations

- ❌ Dynamic imports in hot paths (`src/helpers/classicBattle*`, `battleEngineFacade.js`)
- ❌ Unsilenced `console.warn/error` in tests (use `withMutedConsole`)
- ❌ Functions >50 lines without refactoring
- ❌ Missing `@pseudocode` in public function JSDoc
- ❌ Modifying public APIs without explicit approval

---

## 🚨 RAG-First Policy (MANDATORY)

**Before using `grep_search`, `file_search`, or `semantic_search`, ALWAYS ask yourself:**

1. **Is this a How/Why/What/Where/Which question?** → Use `queryRag()` FIRST
2. **Did RAG return weak results?** → Then use grep/ripgrep as fallback
3. **Document your reasoning** → Cite RAG sources in commits/PRs

### ⚡ When to Use RAG (Examples)

✅ **"How should I add a new tooltip?"**
→ RAG query: `"tooltip implementation data structure JSON format"`
→ Expected result: PRD with exact structure + examples

✅ **"Where is the battle timer implemented?"**
→ RAG query: `"classic battle mode countdown timer phases implementation"`
→ Expected result: File locations + code patterns

✅ **"What is the structure of judoka.json?"**
→ RAG query: `"judoka data structure schema format fields"`
→ Expected result: Exact JSON format + validation rules

✅ **"Why does stat selection timeout after 5 seconds?"**
→ RAG query: `"stat selection timer cooldown timeout configuration"`
→ Expected result: Design rationale + related code

✅ **"How do I handle keyboard shortcuts in components?"**
→ RAG query: `"keyboard event handling shortcuts component patterns"`
→ Expected result: Established patterns + examples

### 🔍 When grep/ripgrep is Appropriate (After RAG Fails)

- Searching for specific variable/function names across codebase
- Finding all usages of a deprecated API before removing it
- Locating files that import a specific module
- When RAG returns insufficient or zero results

### 📊 Performance & Accuracy Baseline

- **RAG speed**: ~2 seconds with 62.5% accuracy for implementation queries
- **Manual grep speed**: 30+ seconds of exploration
- **Recommended workflow**: Try RAG first (2 sec) → If weak, grep (30+ sec) = optimal speed

### 🛠 RAG Query Tips

```javascript
// Good: Technical context + file types
await queryRag("tooltip content validation requirements JSON format");

// Good: Multi-intent queries (automatically split and re-ranked)
await queryRag("navigation bar button transition duration styling");

// With provenance tracking (recommended)
const results = await queryRag("classic battle scoreboard rendering", {
  withProvenance: true
});
// Include contextPath and rationale in PR descriptions
```

---

## 🗂️ Workflow Order

Deterministic rules, workflows, and safety requirements for AI Agents operating in the JU-DO-KON! repository.

**Audience**: AI Agents only. Human readability is not the priority.

**Content Ownership**: This file is the authoritative source for agent-specific rules, validation commands, and quality standards. Other documentation files reference this for agent-specific details.

**Quick Reference**: [Validation Command Matrix](./design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks) | [Test Quality Verification](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference) | [Vector Database RAG Operations](./design/productRequirementsDocuments/prdVectorDatabaseRAG.md#operations--tooling)

---

## ⚡ Executive Summary

**Quick Orientation for AI Agents (30-second read):**

1. **Default to RAG first** - Query `queryRag("your question")` for any "How/Why/What/Where" questions (15x faster than manual exploration)
2. **Follow 5-step workflow** - Context → Task Contract → Implementation → Validation → Delivery
3. **Run targeted tests** - Avoid the full suite. Run tests relevant to your changes. See the [Targeted Testing](#-targeted-testing) section for how.
4. **Core validation suite** - `npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run <tests>` (always run targeted tests)
5. **Critical rules** - No dynamic imports in hot paths, no unsilenced console in tests, include `@pseudocode` in JSDoc
6. **Key files** - `src/data/tooltips.json`, `src/data/judoka.json`, `src/config/settingsDefaults.js`
7. **Quality standards** - Functions ≤50 lines, test happy+edge cases, maintain net-better repo state
8. **Hot path protection** - Use static imports in `src/helpers/classicBattle*`, `battleEngineFacade.js`
9. **Machine-readable rules** - See JSON ruleset at bottom of document for programmatic access
10. **Task contracts required** - Declare inputs/outputs/success/error before execution
11. **Complete validation reference** - [PRD: Development Standards – Validation Command Matrix](./design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks) aggregates workflow commands; pair with [PRD: Testing Standards – Quality Verification Commands](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference) for test-specific policies

**JSON Ruleset Location**: [Line 545+](#machine-readable-ruleset) | **RAG Guide**: [Vector Database RAG Operations](./design/productRequirementsDocuments/prdVectorDatabaseRAG.md#operations--tooling)

---

## � Table of Contents

- [⚡ Executive Summary](#-executive-summary)
- [🗂️ Workflow Order](#️-workflow-order)
- [🎯 Core Principles](#-core-principles)
- [🧠 RAG Policy](#-rag-retrieval-augmented-generation-policy)
- [📚 Key Repository Targets](#-key-repository-targets)
- [🧪 Task Contract](#-task-contract)
- [✅ Evaluation Criteria](#-evaluation-criteria)
- [⚔️ Classic Battle Testing](#️-classic-battle-testing)
- [🎯 Targeted Testing](#-targeted-testing)
- [🧪 Unit Test Quality Standards](#-unit-test-quality-standards)
- [🎭 Playwright Test Quality Standards](#-playwright-test-quality-standards)
- [🧯 Runtime Safeguards](#-runtime-safeguards)
- [🔧 Import Policy](#-import-policy)
- [🛠 Validation Commands](#-validation-commands)
- [🧪 Log Discipline](#-log-discipline)
- [📦 PR Delivery Rules](#-pr-delivery-rules)
- [🧭 Plan Discipline](#-plan-discipline-for-bots)
- [📊 Machine-Readable Ruleset](#-machine-readable-ruleset)

---

## �🗂️ Workflow Order

1. Context acquisition (queryRag, key file references)
2. Task contract definition (inputs/outputs/success/error)
3. Implementation (import policy, coding rules)
4. Validation (lint, format, targeted tests, contrast, logs)
5. Delivery (PR body with verification summary)

```bash
# Fail if dynamic import appears in hot paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null
  && echo "Found dynamic import in hot path" && exit 1 || true

# Fail if unsilenced console.warn/error found in tests (ignore utility wrapper)
grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js"
  && echo "Unsilenced console found" && exit 1 || true

# JSON validation
npm run validate:data

# RAG validation
npm run rag:validate
```

**For complete validation commands, quality verification, and troubleshooting, see [PRD: Development Standards – Validation Command Matrix](./design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks) and [PRD: Testing Standards – Quality Verification Commands](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference).**

---

## 🎯 Core Principles

- Maintain clarity, modularity, determinism.
- Do not silently modify public APIs, schemas, or user-facing text.
- Ensure all outputs are verifiable (tests, linters, CI must pass).

## Policy Manifest

```json
{
  "must": ["no_dynamic_imports_in_hot_paths", "no_unsilenced_console_warn_error_in_tests"],
  "should": ["preload_optional_modules", "add_pseudocode_for_public_functions"],
  "must_not": ["placeholder_text_tooltips", "duplicate_stat_labels"]
}
```

---

## 🧠 RAG (Retrieval-Augmented Generation) Policy

This project contains a high-performance vector database with over 2,300 indexed chunks (2,328 currently) covering documentation, code standards, and game rules. RAG queries return results in ~2 seconds with 62.5% accuracy for finding correct sources.

**See also**: [Quick Reference Cards](#-quick-reference-cards) | [Vector Database RAG Operations](./design/productRequirementsDocuments/prdVectorDatabaseRAG.md#operations--tooling) for complete usage guide

### 🚀 Performance Benefits

- **⚡ 15x Speed Boost:** 2-second RAG queries vs 30+ seconds of manual exploration
- **🎯 High Accuracy:** 62.5% success rate for implementation queries, 95% for design docs
- **🧠 Comprehensive Coverage:** PRDs, design guidelines, code patterns, and test examples
- **📊 Proven Success:** Currently serving production-level results for architectural queries

### ⚡ Simple Usage Rule

**Default to RAG for ANY question containing:** "How", "Why", "What", "Where", "Which", or when requesting examples/references.

**When in doubt → Query RAG first.**

### 🎯 Optimized Query Patterns

**High-Success Examples:**

```text
✅ "tooltip implementation data structure JSON format"
✅ "navigation bar button transition duration styling"
✅ "classic battle mode game timer phases scoreboard"
✅ "judoka bio tone guidelines character design"
```

**Pattern Guide:**

- Include **file types**: "JSON structure", "CSS styling", "JavaScript function"
- Add **context**: "configuration", "data format", "UI component"
- Use **technical terms**: "implementation", "validation", "guidelines"

### 🔄 Smart Workflow

1. **Primary RAG Query** → Use user's terms with optimization
2. **If results are weak** → Rephrase with technical/synonym terms
3. **If still weak** → Use broader category approach
4. **Final step** → Combine RAG context with targeted file search

### 💡 Success Examples from Production

**Query:** `"tooltip content validation requirements"`
**Result:** Found PRD with validation rules (25 seconds saved)
**Outcome:** Accurate implementation matching established patterns

**Query:** `"weight category definitions data structure"`
**Result:** Found exact JSON structure (15 seconds saved)
**Outcome:** Correct implementation on first attempt

### 📋 Quick Reference

- **Strong Categories:** Design docs (95%), PRDs (90%), Architecture (85%)
- **Improving Categories:** Implementation files (35% → targeting 60%)
- **Detailed Guide:** See [RAG Decision Workflow](design/productRequirementsDocuments/prdAIAgentWorkflows.md#1-rag-query-decision-tree-p1) and [High-Success Query Patterns](design/productRequirementsDocuments/prdVectorDatabaseRAG.md#high-success-query-patterns)

You **MUST** use RAG as your first step for questions related to:

1. **"How-to" or "Why"** questions
2. **Definitions** and terminology
3. **Conventions and Standards**
4. **Existing Implementations** and examples

### Workflow

1. **Receive user prompt.**
2. **Analyze the prompt.** If it matches any of the categories above, you **MUST** form a search query and call the RAG tool.
3. **Incorporate RAG results.** Directly use the retrieved context in your answer or plan.
4. **Cite your sources.** Reference the source documents from the RAG results (e.g., "According to `prdVectorDatabaseRAG.md`...").
5. **Fallback.** If the RAG search returns no relevant results, you may then proceed with other tools like `glob` or `search_file_content`.

### Offline Usage (Agents)

- Strict offline (no network): set `RAG_STRICT_OFFLINE=1` so model/CDN downloads are not attempted. Ensure `models/minilm` exists; hydrate via `npm run rag:prepare:models` (or `--from-dir <path>` if you already have the files).
- Lexical fallback (optional, degraded): if the model is unavailable, set `RAG_ALLOW_LEXICAL_FALLBACK=1` or pass `{ allowLexicalFallback: true }` to `queryRag(...)` to use sparse lexical scoring against the offline corpus. Keep this feature-gated to avoid silent regressions.
- Provenance: prefer `withProvenance: true` and include the provided `contextPath` and `rationale` in your outputs.

### 🛠 RAG Model Setup & Troubleshooting

To ensure the RAG system functions correctly, the local MiniLM model must be present and correctly configured.

**1. Prepare the Local Model:**
If you encounter errors related to model loading or "Local model not found", you need to download and prepare the local RAG model files.

```bash
npm run rag:prepare:models
```

This command will download the necessary model files into `models/minilm`.

**2. Verify Model Files:**
You can manually check if the RAG model files are present and accounted for using the following command:

```bash
npm run check:rag
```

This script verifies the existence of all required model files. It is also integrated into the pre-commit hook to provide a warning if files are missing.

**3. Troubleshooting Model Loading Issues:**

- **"Failed to load model because protobuf parsing failed."**: This often indicates corrupted or incomplete model files. Run `npm run rag:prepare:models` to re-download them.
- **"Local model not found; falling back..."**: While this message might appear even if the local model is eventually used, ensure `npm run rag:prepare:models` has been run. Check the console logs for "RAG: Successfully loaded local MiniLM model." for confirmation of local model usage.
- **Network Issues**: If falling back to CDN fails due to network connectivity, ensure your network is stable or use `npm run rag:prepare:models` to set up the local model for offline use.

### Agent Usage Tips (RAG)

- Prefer `queryRag({ withProvenance: true })` for “How/Why/What/Where/Which” questions to include `contextPath` and a short `rationale` explaining ranking.
- During development, you may pass `withDiagnostics: true` to receive `{ expandedQuery, multiIntentApplied, timingMs }` for debugging. Do not enable diagnostics in hot paths.
- For compound queries, RAG automatically splits simple conjunctions and re-ranks the union; still keep queries concise and specific.

Example:

```js
import queryRag from "./src/helpers/queryRag.js";
const results = await queryRag("classic battle countdown snackbar", {
  withProvenance: true,
  withDiagnostics: true
});
// results[0] → { id, text, score, source, tags, contextPath, rationale }
// results.diagnostics → { expandedQuery: "...", multiIntentApplied: true|false, timingMs }
```

### Example Agent Thought Process

> **User:** "How should I add a new tooltip?"
>
> **Agent's internal monologue:**
>
> 1. The user is asking "How should I...", which falls under the "How-to" category in the RAG policy.
> 2. I must use the RAG tool first. I will form a query.
> 3. **Tool Call:** `query_rag_database(query="adding a new tooltip")`
> 4. **Tool Output:** `[{ "source": "src/data/tooltips.json", "text": "Tooltips are defined in`tooltips.json`with an id and content.", "score": 0.91 }, ...]`
> 5. Now I can form my answer based on this high-confidence information. I will explain that tooltips are added to `src/data/tooltips.json` and describe the required format.

### Provenance

When using information from the RAG tool, include provenance for the facts:

- `Source: <doc>` — `Confidence: high|medium|low` — `Quote: "..."`.

RAG Provenance JSON schema:

```json
{
  "source": "design/productRequirementsDocuments/prdVectorDatabaseRAG.md#high-success-query-patterns",
  "confidence": "high",
  "quote": "Use queryRag for architectural questions."
}
```

---

## 📚 Key Repository Targets

| Domain         | Files / Paths                                               |
| -------------- | ----------------------------------------------------------- |
| Tooltips       | `src/data/tooltips.json`                                    |
| Stats          | `src/data/judoka.json`, `src/data/statNames.js`             |
| Flags/Settings | `src/pages/settings.html`, `src/config/settingsDefaults.js` |
| Tooltip Viewer | `src/pages/tooltipViewer.html`                              |
| Factories      | `src/components/*.js`                                       |
| Battle Logic   | `classicBattle.js`, `setupScoreboard.js`, `Scoreboard.js`   |
| Entry Points   | `src/pages/*.html`                                          |
| Tests          | `tests/**/*.test.js`, `playwright/*.spec.js`                |

⚠️ Exclude from searches:

- `client_embeddings.json`
- `offline_rag_metadata.json`
- `eslint-dry.json`

---

## 🧪 Task Contract

Declare before execution:

- **Inputs**: explicit files/data/commands
- **Outputs**: changed files/tests/docs
- **Success**: all validation passes, no unsuppressed console logs
- **Error mode**: explicit stop conditions

Task Contract JSON template:

```json
{
  "inputs": ["src/classicBattle.js", "playwright/classicBattle.spec.js"],
  "outputs": ["src/classicBattle.js", "tests/classicBattle.spec.js"],
  "success": ["eslint: PASS", "vitest: PASS", "jsdoc: PASS", "no_unsilenced_console"],
  "errorMode": "ask_on_public_api_change"
}
```

---

## ✅ Evaluation Criteria

- Functions ≤50 lines, modular, single-purpose
- JSDoc `@pseudocode` for public + complex functions
- JSON validated (`npm run validate:data`)
- Repo state “net better” (clarity, naming, structure)
- ≥1 happy-path + 1 edge-case test for new logic

---

## ⚔️ Classic Battle Testing

- Initialize: `initClassicBattleTest({ afterMock: true })` after mocks
- Use event promises:
  - `getRoundPromptPromise`
  - `getCountdownStartedPromise`
  - `getRoundResolvedPromise`
  - `getRoundTimeoutPromise`
  - `getStatSelectionStalledPromise`
- Assert:
  - Round → `#round-message`
  - Countdown/hints → snackbar
- Cleanup: clear snackbar + `#round-message` after each test

---

## 🎯 Targeted Testing

To maintain efficiency and speed, agents **MUST** avoid running the full test suite for every change. Instead, run targeted tests relevant to the modifications.

### Workflow

1.  **Identify Relevant Tests**: Before running tests, analyze the changes to identify the corresponding test files. For example, a change in `src/components/Header.js` should be tested by `tests/components/Header.test.js`.

2.  **Run Specific Test Files**: Use `vitest` to run only the relevant test files.

    ```bash
    # Run a single test file
    npx vitest run tests/components/Header.test.js

    # Run tests from a specific folder
    npx vitest run tests/components/
    ```

3.  **Use Project-Specific Scripts**: For larger, but still contained, changes, use the specialized test scripts in `package.json`.

    ```bash
    # Run tests for the classic battle mode
    npm run test:battles:classic

    # Run tests for the CLI battle mode
    npm run test:battles:cli
    ```

### When to Run the Full Suite

Only run the full test suite (`npx vitest run` or `npm test`) under these circumstances:

- Making widespread, cross-cutting changes (e.g., refactoring a core utility used by many components).
- Changing configuration files that affect the entire application (`vite.config.js`, etc.).
- Before submitting a pull request to ensure no unintended side effects.

---

## 🚫 Don’t manipulate the DOM directly in tests

Justification: directly mutating DOM nodes in unit or integration tests (for example calling
`appendChild`/`replaceChildren`, setting `innerHTML`, toggling classes, or changing attributes to
simulate state) bypasses the application’s runtime logic, lifecycle hooks, accessibility
attributes, and scheduling. That makes tests brittle and can hide regressions — tests may
pass because they short-circuit real code paths rather than exercising them.

Recommended alternatives:

- Drive behavior through public APIs and helpers (e.g. click handlers, `setup*` helpers,
  orchestrator mocks) so tests exercise the same code the app runs in production.
- Use user-focused testing helpers (Playwright `page.click`/`page.fill`, Testing Library's
  `userEvent` / `fireEvent`) to simulate interactions instead of directly mutating nodes.
- In unit tests prefer querying and asserting observable state changes (DOM queries,
  emitted events, store/orchestrator calls) rather than checking implementation details.
- If a test must manipulate DOM (rare), isolate it, document why it's required, restore
  the DOM state after the test, and prefer using helper fixtures rather than ad-hoc mutations.

Short rule: assert behavior, not implementation; simulate users, not internals.

---

## 🧪 Unit Test Quality Standards

### Core Anti-Patterns to Eliminate

**❌ Avoid These Patterns:**

- Direct DOM manipulation (use natural interactions via component APIs)
- Synthetic event dispatching (use keyboard/mouse simulation utilities)
- Raw console.error/warn spies without muting (use withMutedConsole)
- Real timers in deterministic tests (use fake timers with vi.useFakeTimers)
- Manual element creation (use component test utilities)

**✅ Preferred Patterns:**

- Natural component interaction through public APIs
- Keyboard/gesture simulation via componentTestUtils helpers
- Console discipline with withMutedConsole() standardization
- Fake timer control with vi.runAllTimersAsync() for determinism
- Component factories for consistent test setup

### Testing Infrastructure Standards

**Component Test Utilities (`tests/utils/componentTestUtils.js`):**

```js
// Use natural interaction patterns
const { container, pressKey, simulateGesture } = createTestComponent(componentFactory);
await pressKey("ArrowLeft"); // Natural keyboard navigation
await simulateGesture("swipeLeft"); // Natural gesture interaction
```

**Console Discipline (`tests/utils/console.js`):**

```js
import { withMutedConsole } from "../utils/console.js";

// Standard pattern for error testing
await withMutedConsole(async () => {
  expect(() => functionThatLogs()).toThrow();
});
```

**Timer Management:**

```js
// Setup fake timers for deterministic control
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runAllTimers();
  vi.restoreAllMocks();
});

// Advance timers deterministically
await vi.runAllTimersAsync();
```

### Performance and Reliability Targets

- **No real timeouts** in unit tests (use fake timers)
- **Muted console discipline** for all error-generating tests
- **Natural interaction patterns** over synthetic event dispatching
- **Component-driven testing** instead of direct DOM manipulation
- **Deterministic timing control** with async timer resolution

### Test Quality Verification

Run validation for established patterns:

```bash
# Verify no synthetic events in hot paths
grep -r "dispatchEvent\|createEvent" tests/ && echo "Found synthetic events"

# Verify console discipline compliance
grep -r "console\.(warn\|error)" tests/ | grep -v "tests/utils/console.js" && echo "Found unsilenced console"

# Verify timer discipline
grep -r "setTimeout\|setInterval" tests/ | grep -v "fake\|mock" && echo "Found real timers"
```

---

## 🧬 Modern Test Harness Architecture (Vitest 3.2.4+)

### Key Concepts

The JU-DO-KON! project uses a modern test harness pattern that aligns with Vitest's module lifecycle. This pattern separates mock registration (top-level `vi.mock()`) from environment setup (`createSimpleHarness()`), enabling both unit and integration test patterns.

Key Principle: Vitest requires `vi.mock()` calls at the top level of test files during static analysis. Late-stage mock registration (in hooks) no longer works reliably in Vitest 3.x.

### Unit Test Pattern: Mock All Dependencies

For isolated testing of functions, components, or utilities.

```javascript
// Step 1: Create shared mock references
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn()
}));

// Step 2: Register mocks at top level (MUST be top level)
vi.mock("../../src/services/api.js", () => ({
  fetchData: mockFetch
}));

// Step 3: Setup harness
let harness;
beforeEach(async () => {
  mockFetch.mockReset().mockResolvedValue({ id: 1 });
  harness = createSimpleHarness(); // No mocks parameter
  await harness.setup();
});

// Step 4: Import modules AFTER setup()
it("test", async () => {
  const { processData } = await import("../../src/helpers/processData.js");
  // Uses mocked dependencies
});
```

**When to use**: Testing isolated utilities, error handling, specific branches.

### Integration Test Pattern: Mock Only Externals

For testing workflows with multiple internal modules interacting.

```javascript
// Only mock EXTERNAL dependencies (network, storage, browser APIs)
vi.mock("../../src/services/battleApi.js", () => ({
  fetchOpponent: vi.fn().mockResolvedValue({ id: 1 })
}));

// Internal modules are NOT mocked - they use real implementations

let harness;
beforeEach(async () => {
  harness = createSimpleHarness({
    fixtures: {
      localStorage: createMockLocalStorage(),
      fetch: createMockFetch()
    },
    useFakeTimers: true
  });
  await harness.setup();
});

it("test", async () => {
  // Imports real battleFlow, battleEngine, helpers
  // But external API calls and storage are mocked
  const { initBattle } = await import("../../src/helpers/battleFlow.js");
  const battle = await initBattle();
  expect(battle).toBeDefined();
});
```

**When to use**: Testing workflows, features, user interactions, state management.

### `createSimpleHarness()` API

```javascript
const harness = createSimpleHarness({
  useFakeTimers: true, // Enable fake timers (default: true)
  useRafMock: true, // Mock requestAnimationFrame (default: true)
  fixtures: {
    // Inject test fixtures
    localStorage: mockStorage,
    fetch: mockFetch,
    matchMedia: mockMediaQuery
  },
  setup: async () => {
    // Custom setup function (optional)
    // Additional setup
  },
  teardown: () => {
    // Custom teardown function (optional)
    // Additional cleanup
  }
});

await harness.setup(); // Apply all configuration
const module = await harness.importModule("path"); // Import with mocks applied
harness.cleanup(); // Cleanup after test
```

### Fixture Factories

**Available Fixtures** (in `tests/utils/testUtils.js`):

- `createMockLocalStorage()` - In-memory storage with standard API
- `createMockFetch(defaultResponses)` - Network request mocking with URL patterns
- `createMockMatchMedia(initialMatches)` - CSS media query mocking

**Example Usage**:

```javascript
const mockStorage = createMockLocalStorage();
const mockFetch = createMockFetch({
  "/api/opponent": { status: 200, data: { id: 1 } }
});

harness = createSimpleHarness({
  fixtures: { localStorage: mockStorage, fetch: mockFetch }
});
```

### Deprecated Pattern (DO NOT USE)

❌ **Old (Deprecated - No Longer Works in Vitest 3.x)**:

```javascript
beforeEach(() => {
  vi.doMock("../../src/helpers/myHelper", () => ({
    helperFn: vi.fn()
  }));
  harness = createSettingsHarness({ mocks: { /* ... */ } });
  await harness.setup();
});
```

This pattern no longer works because:

- `vi.doMock()` in hooks is too late in Vitest's module lifecycle
- Modules are already loaded and cached
- Mocks never get applied

✅ **New (Current - Vitest 3.x Compatible)**:

```javascript
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock("../../src/helpers/myHelper", () => ({ helperFn: mockFn }));

beforeEach(async () => {
  mockFn.mockReset();
  harness = createSimpleHarness(); // No mocks parameter
  await harness.setup();
});
```

### Common Patterns

**Per-Test Mock Configuration**:

```javascript
it("handles success", async () => {
  mockFetch.mockResolvedValue({ status: 200 });
  // test code
});

it("handles error", async () => {
  mockFetch.mockRejectedValue(new Error("Network error"));
  // test code
});
```

**Module Caching**:

```javascript
// Module imported once in beforeEach (for integration tests)
const module = await harness.importModule("../../src/helpers/myHelper.js");

// Or import per-test (for unit tests with different mocks)
it("test", async () => {
  const { fn } = await import("../../src/helpers/fn.js");
  // uses fresh mock state for this test
});
```

### Timer Control

```javascript
it("test timer behavior", async () => {
  harness = createSimpleHarness({ useFakeTimers: true });
  await harness.setup();

  // harness.timerControl provides access to timers
  await harness.timerControl.advanceTimersByTime(5000);

  // Verify behavior after time advancement
});
```

### Reference Documentation

- **Implementation**: `tests/helpers/integrationHarness.js`
- **Test Examples**: `tests/examples/unit.test.js` (all mocks), `tests/examples/integration.test.js` (externals only)
- **Guide**: `tests/examples/README.md`
- **Fixtures Reference**: `tests/fixtures.reference.js`
- **Real-World Examples**:
  - `tests/helpers/settingsPage.test.js` (16 tests, 100% passing)
  - `tests/helpers/integrationHarness.test.js` (28 tests, 100% passing)

### Troubleshooting

**Issue**: "Cannot find module" or mock not applying

**Solution**:

1. Ensure `vi.mock()` is at TOP LEVEL (not in functions/loops)
2. Ensure module imports happen AFTER `harness.setup()`
3. Use `vi.hoisted()` for shared mock references

**Issue**: Different tests need different mock behaviors

**Solution**: Use `vi.hoisted()` to create shared reference, configure per-test:

```javascript
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));

it("test 1", async () => {
  mockFn.mockReturnValue(valueA);
  // test
});

it("test 2", async () => {
  mockFn.mockReturnValue(valueB);
  // test
});
```

**Issue**: Fixtures not injected into code

**Solution**: Import modules AFTER `harness.setup()`, or use `harness.importModule()`

---

## 🎭 Playwright Test Quality Standards

### Core Anti-Patterns to Eliminate

**❌ Avoid These Patterns:**

- Direct page.evaluate() DOM manipulation (use natural user interactions)
- Hardcoded wait times with page.waitForTimeout() (use specific condition waits)
- Complex CSS selectors that test implementation details (use data-testid attributes)
- Manual localStorage clearing in individual tests (use global setup/teardown)
- Assertions without proper waiting (use expect().toHaveText() with auto-retry)

**✅ Preferred Patterns:**

- Natural user interactions via page.click(), page.fill(), page.press()
- Conditional waiting with page.waitForSelector(), page.waitForLoadState()
- Semantic selectors using data-testid, role, or accessible names
- Centralized test state management via fixtures and global setup
- Auto-retrying assertions with proper timeout configuration

### Playwright Infrastructure Standards

**Interaction Patterns:**

```js
// Natural user interactions
await page.click('[data-testid="submit-button"]');
await page.fill('[data-testid="username-input"]', "testuser");
await page.press("body", "Escape");

// Proper waiting for conditions
await page.waitForSelector('[data-testid="success-message"]');
await expect(page.locator('[data-testid="result"]')).toHaveText("Expected");
```

**State Management:**

```js
// Use fixtures for consistent setup
test.beforeEach(async ({ page }) => {
  await page.goto("/test-page");
  await page.waitForLoadState("networkidle");
});

// Avoid manual localStorage manipulation in tests
// Use global setup in playwright.config.js instead
```

**Selector Strategy:**

```js
// Preferred: Semantic selectors
await page.click('[data-testid="navigation-menu"]');
await page.click('role=button[name="Submit"]');

// Avoid: Implementation-detail selectors
// await page.click('.menu-container > div:nth-child(2) > button');
```

### Performance and Reliability Targets

- **No hardcoded timeouts** (use condition-based waiting)
- **Semantic selectors** that survive refactoring
- **Natural user interactions** that match real usage patterns
- **Proper test isolation** with consistent setup/teardown
- **Auto-retrying assertions** with appropriate timeout configuration

### Playwright Quality Verification

Run validation for established patterns:

```bash
# Verify no hardcoded timeouts
grep -r "waitForTimeout\|setTimeout" playwright/ && echo "Found hardcoded waits"

# Verify semantic selectors usage
grep -r "data-testid\|role=" playwright/ | wc -l && echo "Semantic selectors count"

# Verify no direct DOM manipulation
grep -r "page\.evaluate.*DOM\|innerHTML\|appendChild" playwright/ && echo "Found DOM manipulation"
```

---

## 🧯 Runtime Safeguards

- Exclude embeddings files in grep/search
- Animation:
  - One-shot → `requestAnimationFrame`
  - Continuous → `scheduler.onFrame()` + cancel with `scheduler.cancel(id)`
- Selection timers: clear `statTimeoutId` + `autoSelectId` before `statSelected`

Safe search aliases:

```bash
# Prefer ripgrep if available
alias rgs='rg -n --hidden --glob "!node_modules" --glob "!client_embeddings.json" --glob "!offline_rag_metadata.json"'
# grep fallback
alias greps='grep -RIn --exclude-dir=node_modules --exclude=client_embeddings.json --exclude=offline_rag_metadata.json'
```

---

## 🔧 Import Policy

- Hot path → static import
- Optional/heavy/flagged → dynamic import + preload during idle
- No `await import()` in stat selection, round decision, event dispatch, or render loops
- Preserve feature flag guards
- Deliverables: file list + rationale, tests for static/preload behavior

Hot path files (non-exhaustive):

- `src/helpers/classicBattle.js`
- `src/helpers/battleEngineFacade.js`
- `src/helpers/BattleEngine.js`
- `src/helpers/showSnackbar.js` (if used during round flow)

Autotest snippets (optional):

```bash
# Detect dynamic imports in hot paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null \
  && echo "Found dynamic import in hot path" && exit 1 || true

# Hint: check preload usage for optional modules
rg -n "preload\(|link rel=preload" src || echo "Consider preloading optional modules during idle"
```

---

## 🎯 Classic Battle Initialization

### Phase Order (Critical for Agents)

When modifying Classic Battle initialization (`src/pages/battleClassic.init.js`):

**DO NOT** change the order of phase execution  
**DO NOT** move `wireControlButtons` before `initializeMatchStart`  
**DO NOT** move `wireExistingStatButtons` after `initializeMatchStart`

### Why This Matters

**Problem**: DOM elements replaced during initialization lose event handlers.

**Solution**: Wire handlers AFTER all DOM manipulation is complete.

**Historical Bug**: Quit button handler was lost because it was wired before Phase 5 (match start), then the button was replaced via `resetQuitButton()` during Phase 5, losing the handler.

**Fix**: Move `wireControlButtons()` to run AFTER `initializeMatchStart()`.

### Critical Timing Requirements

```javascript
// Phase 1-4: Utilities, UI, Engine, Event Handlers
await initializePhase1_Utilities();
await initializePhase2_UI();
await initializePhase3_BattleEngine(store);
await initializePhase4_EventHandlers(store);

// ✅ Wire stat buttons BEFORE match start (needed for gameplay)
wireExistingStatButtons(store);

// Phase 5: Match Start (buttons get replaced here!)
await initializeMatchStart(store);

// ✅ Wire control buttons AFTER match start (prevents handler loss)
wireControlButtons(store);
```

### Event Handler Registration (Critical for Snackbar Dismissal)

The Classic Battle bootstrap MUST call `bindRoundUIEventHandlersDynamic()` during initialization. This function registers the `round.start` event handler that dismisses countdown and opponent snackbars when advancing to the next round.

**Bug History**: When this call was missing, snackbars ("Opponent is choosing...", "You picked: X", countdown timers) would persist across rounds instead of being dismissed, creating visual clutter and confusing users.

**Location**: `src/helpers/classicBattle/bootstrap.js` line 79

**CLI Battle**: The same fix applies to CLI Battle mode via `src/pages/battleCLI/init.js` line 3308 in the `wireEvents()` function.

**Test Coverage**:
- `tests/helpers/classicBattle/bootstrap-event-handlers.test.js` - Verifies handler registration
- `tests/helpers/classicBattle/snackbar-dismissal-events.test.js` - Tests event flow

**Validation Command**:
```bash
# Verify the critical call is present in both battle modes
grep -n "bindRoundUIEventHandlersDynamic" src/helpers/classicBattle/bootstrap.js src/pages/battleCLI/init.js

# Expected output:
# src/helpers/classicBattle/bootstrap.js:79:      bindRoundUIEventHandlersDynamic();
# src/pages/battleCLI/init.js:50:import { bindRoundUIEventHandlersDynamic } from...
# src/pages/battleCLI/init.js:3308:  bindRoundUIEventHandlersDynamic();
```

### Validation Command

```bash
# Verify initialization order is correct
grep -A 20 "async function init()" src/pages/battleClassic.init.js | \
  grep -E "wireControlButtons|wireExistingStatButtons|initializeMatchStart"

# Expected output (in this order):
# wireExistingStatButtons(store);  ← BEFORE match start
# await initializeMatchStart(store);
# wireControlButtons(store);       ← AFTER match start
```

### Button Replacement Behavior

| Button       | Replaced During Init?    | Wire Timing                          |
| ------------ | ------------------------ | ------------------------------------ |
| Quit         | ✅ Yes (resetQuitButton) | After Phase 5                        |
| Next         | ✅ Yes (resetNextButton) | After Phase 5                        |
| Replay       | ❌ No                    | After Phase 5                        |
| Stat buttons | ❌ Not during init       | Before Phase 5 (needed for gameplay) |

### Testing

```bash
# Run timing assertion tests after init changes
npx vitest run tests/classicBattle/quit-flow.test.js tests/classicBattle/element-identity.test.js
```

### Reference

See [docs/initialization-sequence.md](docs/initialization-sequence.md) for detailed phase-by-phase breakdown and architectural diagrams.

See [quitFlowIssue.md](quitFlowIssue.md) for the complete bug investigation and lessons learned.

---

## 🚨 Sentry Error Tracking

### When to Use Sentry Instrumentation

Agents should add Sentry instrumentation when implementing:

- Error handling and exception tracking in user-facing features
- Performance-critical sections (battle engine, state management)
- External API calls and data fetching operations
- Custom business logic with non-obvious failure modes

### Error / Exception Tracking

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected

### Tracing Examples

Spans should be created for meaningful actions within an applications like button clicks, API calls, and function calls.
Use the `Sentry.startSpan` function to create a span.
Child spans can exist within a parent span.

#### Custom Span instrumentation in component actions

Name custom spans with meaningful names and operations.
Attach attributes based on relevant information and metrics from the request

```javascript
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click"
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";

        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);

        doSomething();
      }
    );
  };

  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

#### Custom span instrumentation in API calls

Name custom spans with meaningful names and operations.
Attach attributes based on relevant information and metrics from the request

```javascript
async function fetchUserData(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    }
  );
}
```

### Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/browser"`.
Enable logging in Sentry using `Sentry.init({ _experiments: { enableLogs: true } })`.
Reference the logger using `const { logger } = Sentry`.
Sentry offers a `consoleLoggingIntegration` that can be used to log specific console error types automatically without instrumenting the individual logger calls.

#### Configuration

##### Baseline

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://d5c65640106080845226e89b9a1f589c@o4510014518919168.ingest.de.sentry.io/4510014522130512",

  _experiments: {
    enableLogs: true
  }
});
```

##### Logger Integration

```javascript
Sentry.init({
  dsn: "https://d5c65640106080845226e89b9a1f589c@o4510014518919168.ingest.de.sentry.io/4510014522130512",
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })
  ]
});
```

##### Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
import * as Sentry from "@sentry/browser";

const { logger } = Sentry;

logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100
});
```

---

## 🎯 Battle Pages Regression Testing

When making changes to `src/pages/battleClassic.html` or `src/pages/battleCLI.html`, run the centralized regression test suite to ensure no regressions on these critical pages.

**Related sections:** For general Classic Battle test patterns, see [⚔️ Classic Battle Testing](#-classic-battle-testing). For Playwright interaction patterns, see [🎭 Playwright Test Quality Standards](#-playwright-test-quality-standards).

### When to Use This Section

Use these guidelines whenever you modify:

- `src/pages/battleClassic.html`
- `src/pages/battleCLI.html`
- `tests/battles-regressions/*` files

### Quick Validation

```bash
# Full battle pages regression suite
npm run test:battles

# Specific page tests
npm run test:battles:classic   # Classic Battle mode only
npm run test:battles:cli       # CLI Battle mode only
npm run test:battles:shared    # Shared components only

# Development workflows
npm run test:battles:watch     # Watch mode during development
npm run test:battles:cov       # Generate coverage report
```

### Test Suite Organization

Battle page tests are centralized in `tests/battles-regressions/` with clear organization by page and feature:

| Path                                 | Purpose                   |
| ------------------------------------ | ------------------------- |
| `tests/battles-regressions/classic/` | Classic Battle mode tests |
| `tests/battles-regressions/cli/`     | CLI Battle mode tests     |
| `tests/battles-regressions/shared/`  | Shared component tests    |
| `playwright/battle-classic/`         | Classic Battle E2E tests  |
| `playwright/battle-cli*.spec.js`     | CLI Battle E2E tests      |

### What Gets Tested

**Classic Battle (battleClassic.html):**

- Game initialization and bootstrap
- Round selection and validation
- Stat selection and keyboard shortcuts
- Timer functionality (countdown, auto-advance, cooldown)
- Scoring and round resolution
- Opponent message handling
- End-of-match modal and replay
- Feature flag integration
- Accessibility (keyboard navigation, ARIA)

**CLI Battle (battleCLI.html):**

- CLI initialization and prompt rendering
- Keyboard shortcuts and hotkeys
- Number input validation
- Verbose mode toggling and display
- Seed validation
- Points-to-win configuration
- Scoreboard rendering
- Focus management and navigation
- Accessibility (live regions, contrast)

**Shared Components:**

- Scoreboard rendering (both modes)
- Modal component behavior
- Stats panel display
- Battle configuration and defaults

### What's NOT Included in Battle Tests

These battle-specific tests focus on page workflows and user interactions. Other test categories cover:

- **General UI component tests** — See `tests/components/`
- **Data validation tests** — See `tests/data/`
- **Helper function tests (non-battle)** — See `tests/helpers/`
- **Utility and library tests** — See other test directories

### Integration with Main Test Suite

```bash
npm run test:ci                 # Full suite (includes battles)
npm run test:battles            # Battles only (faster feedback)
npm run test                    # Watch all tests
npm run test:watch              # Watch all tests
npm run test:battles:watch      # Watch battles only
```

### Before Submitting PR

Verify these commands pass when changing battle pages:

```bash
# 1. Run battle regression tests
npm run test:battles

# 2. Run with coverage to check if new tests added
npm run test:battles:cov

# 3. Run full test suite before submitting
npm run test:ci
```

### Task Contract for Battle Page Changes

```json
{
  "inputs": ["src/pages/battleClassic.html | src/pages/battleCLI.html"],
  "outputs": [
    "tests/battles-regressions/classic/* | tests/battles-regressions/cli/*",
    "tests/battles-regressions/shared/* (if shared components modified)"
  ],
  "success": [
    "npm run test:battles: PASS",
    "eslint: PASS",
    "jsdoc: PASS",
    "no_unsilenced_console",
    "all new logic covered by tests"
  ],
  "errorMode": "ask_on_regression_failure"
}
```

### Key Validation Commands

```bash
# Essential before commit (from core validation)
npm run check:jsdoc && npx prettier . --check && npx eslint .

# Battle pages specific
npm run test:battles

# Full validation
npm run test:ci && npm run check:contrast
```

### Debugging Test Failures

If battle tests fail after your changes:

1. **Identify which test failed:** Run `npm run test:battles:watch` to watch and locate the failing test
2. **Verify it's not flaky:** Run the test again with `npm run test:battles` to confirm the failure is consistent
3. **Review your changes:** Compare your modifications to the affected page (battleClassic.html or battleCLI.html)
4. **Check dependencies:** If you changed files in `tests/battles-regressions/shared/`, both Classic and CLI tests may be affected

### Common Workflows

**When fixing a bug in Classic Battle:**

```bash
npm run test:battles:classic    # Fast feedback
npm run test:battles:watch      # Watch during development
npm run test:ci                 # Final validation
```

**When adding a feature to CLI Battle:**

```bash
# Create test first, implement, verify (TDD workflow)
npm run test:battles:watch      # Watch mode during development
npm run test:battles:cli        # Final check
```

**When refactoring shared components:**

```bash
npm run test:battles:shared
npm run test:battles            # All battle tests affected
npm run test:ci                 # Full suite
```

### Documentation

Complete plan and guidelines available in:

- `BATTLE_PAGES_TEST_CENTRALIZATION_PLAN.txt` (detailed implementation guide)
- `BATTLE_TEST_PLAN_EXECUTIVE_SUMMARY.txt` (overview)
- `tests/battles-regressions/README.md` (test suite guide)
- `tests/battles-regressions/classic/README.md` (classic tests)
- `tests/battles-regressions/cli/README.md` (CLI tests)
- `tests/battles-regressions/shared/README.md` (shared components)

---

## 🛠 Validation Commands

**Complete command reference:** [PRD: Development Standards – Validation Command Matrix](./design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks) | [PRD: Testing Standards – Quality Verification Commands](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference)
**See also**: [Quick Reference Cards](#-quick-reference-cards) for essential commands

**Essential validation (run before commit):**

```bash
# Step 1: Data & RAG integrity
npm run validate:data
npm run rag:validate

# Step 2: Code quality
npx prettier . --check
npx eslint .
npm run check:jsdoc

# Step 3: Tests (run targeted tests, not the full suite)
# See the "Targeted Testing" section for details.
npx vitest run <path/to/relevant/tests.spec.js>
npx playwright test <path/to/relevant/spec.js>
npm run check:contrast
```

**Auto-fix commands:**

```bash
npx prettier . --write
npx eslint . --fix
npm run check:jsdoc:fix
```

**Agent-specific validation (includes hot-path checks):**

```bash
# Fail if dynamic import appears in hot paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null \
  && echo "Found dynamic import in hot path" && exit 1 || true

# Fail if unsilenced console.warn/error found in tests (ignore utility wrapper)
grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js" \
  && echo "Unsilenced console found" && exit 1 || true

# JSON validation
npm run validate:data

# RAG validation
npm run rag:validate
```

---

## 🧪 Log Discipline

No unsuppressed console.warn/error in code/tests
Wrap with withMutedConsole(fn) or spy via vi.spyOn(console, 'error')

Helper and examples (`tests/utils/console.js`):

```js
import { withMutedConsole, withAllowedConsole } from "../utils/console.js";

await withMutedConsole(async () => {
  // code that would warn or error during tests
});

await withAllowedConsole(async () => {
  // code where specific warnings/errors are expected
});
```

---

## 📦 PR Delivery Rules

PR body must contain:
Task Contract (inputs/outputs/success/error mode)
Files changed list with purpose per file
Verification summary:
eslint: PASS|FAIL
vitest: X passed, Y failed
playwright: PASS|FAIL
jsdoc: PASS|FAIL
Risk + follow-up note

---

### ✅ Verification Checklist

prettier, eslint, jsdoc PASS
vitest + playwright PASS
No unsuppressed console logs
Tests cover happy-path + edge case
CI pipeline green

## 🧭 Plan Discipline for Bots

- Exactly one `in_progress` step at a time.
- Mark a step `completed` before starting the next.
- Keep steps concise (≤ 7 words) and 4–7 steps total is typical.
- Update the plan when scope changes; include a short rationale.

## 📊 Machine-Readable Ruleset

**Schema Version**: 1.0.0
**Last Updated**: September 11, 2025
**Validation**: This JSON should validate against standard schema checkers

### Version History

- **v1.0.0** (2025-09-11): Initial versioned schema with structured validation commands, comprehensive test standards, and centralized documentation references

### Schema Usage

This JSON ruleset can be programmatically parsed for:

- Automated rule validation in CI/CD pipelines
- Agent configuration and initialization
- Policy compliance checking
- Integration with development tooling

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "JU-DO-KON Agent Rules",
  "version": "1.0.0",
  "lastUpdated": "2025-09-11",
  "workflowOrder": ["context", "taskContract", "implementation", "validation", "delivery"],
  "corePrinciples": [
    "clarity",
    "modularity",
    "determinism",
    "no_public_api_changes",
    "verification_required"
  ],
  "contextRules": {
    "queryRag": true,
    "provenanceRequired": true,
    "confirmationAgainstSource": true
  },
  "keyFiles": {
    "tooltips": "src/data/tooltips.json",
    "stats": ["src/data/judoka.json", "src/data/statNames.js"],
    "flags": ["src/pages/settings.html", "src/config/settingsDefaults.js"],
    "tooltipViewer": "src/pages/tooltipViewer.html",
    "factories": "src/components/*.js",
    "battleLogic": ["classicBattle.js", "setupScoreboard.js", "Scoreboard.js"],
    "entryPoints": "src/pages/*.html",
    "tests": ["tests/**/*.test.js", "playwright/*.spec.js"],
    "excludeFromSearch": ["client_embeddings.json", "offline_rag_metadata.json"]
  },
  "taskContract": ["inputs", "outputs", "success", "errorMode"],
  "evaluationCriteria": {
    "functionLengthMax": 50,
    "requirePseudocode": true,
    "validateJson": true,
    "netBetter": true,
    "testsRequired": ["happyPath", "edgeCase"]
  },
  "unitTestQualityStandards": {
    "antiPatterns": [
      "directDomManipulation",
      "syntheticEventDispatching",
      "rawConsoleSpy",
      "realTimersInTests",
      "manualElementCreation"
    ],
    "preferredPatterns": [
      "naturalComponentInteraction",
      "keyboardGestureSimulation",
      "withMutedConsole",
      "fakeTimerControl",
      "componentFactories"
    ],
    "testingInfrastructure": {
      "componentUtils": "tests/utils/componentTestUtils.js",
      "consoleUtils": "tests/utils/console.js",
      "timerManagement": "vi.useFakeTimers",
      "naturalInteraction": "pressKey/simulateGesture"
    },
    "performanceTargets": [
      "noRealTimeouts",
      "mutedConsoleDiscipline",
      "naturalInteractionPatterns",
      "componentDrivenTesting",
      "deterministicTimingControl"
    ],
    "verificationCommands": [
      "grep -r \"dispatchEvent\\|createEvent\" tests/",
      "grep -r \"console\\.(warn\\|error)\" tests/ | grep -v \"tests/utils/console.js\"",
      "grep -r \"setTimeout\\|setInterval\" tests/ | grep -v \"fake\\|mock\""
    ]
  },
  "playwrightTestQualityStandards": {
    "antiPatterns": [
      "directPageEvaluateDomManipulation",
      "hardcodedWaitTimeouts",
      "complexImplementationSelectors",
      "manualLocalStorageClearing",
      "assertionsWithoutWaiting"
    ],
    "preferredPatterns": [
      "naturalUserInteractions",
      "conditionalWaiting",
      "semanticSelectors",
      "centralizedStateManagement",
      "autoRetryingAssertions"
    ],
    "interactionPatterns": {
      "userActions": "page.click/fill/press",
      "waiting": "page.waitForSelector/waitForLoadState",
      "selectors": "data-testid/role/accessible-names",
      "assertions": "expect().toHaveText() with auto-retry"
    },
    "performanceTargets": [
      "noHardcodedTimeouts",
      "semanticSelectorUsage",
      "naturalUserInteractions",
      "properTestIsolation",
      "autoRetryingAssertions"
    ],
    "verificationCommands": [
      "grep -r \"waitForTimeout\\|setTimeout\" playwright/",
      "grep -r \"data-testid\\|role=\" playwright/ | wc -l",
      "grep -r \"page\\.evaluate.*DOM\\|innerHTML\\|appendChild\" playwright/"
    ]
  },
  "classicBattleTesting": {
    "initHelper": "initClassicBattleTest({ afterMock: true })",
    "eventPromises": [
      "getRoundPromptPromise",
      "getCountdownStartedPromise",
      "getRoundResolvedPromise",
      "getRoundTimeoutPromise",
      "getStatSelectionStalledPromise"
    ],
    "assertions": {
      "outcome": "#round-message",
      "countdown": "snackbar"
    },
    "cleanup": ["clearSnackbar", "clearRoundMessage"]
  },
  "runtimeSafeguards": {
    "excludeEmbeddingsFromSearch": true,
    "animation": {
      "oneShot": "requestAnimationFrame",
      "continuous": "scheduler.onFrame()",
      "cancel": "scheduler.cancel(id)"
    },
    "timers": ["statTimeoutId", "autoSelectId"]
  },
  "importPolicy": {
    "hotPath": "static",
    "optional": "dynamicPreload",
    "forbiddenContexts": ["statSelection", "roundDecision", "eventDispatch", "renderLoop"],
    "preserveFeatureFlags": true
  },
  "validationCommands": {
    "centralReference": "design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks",
    "essential": [
      "npx prettier . --check",
      "npx eslint .",
      "npm run check:jsdoc",
      "npx vitest run",
      "npx playwright test",
      "npm run check:contrast"
    ],
    "agentSpecific": [
      "npm run rag:validate",
      "npm run validate:data",
      "grep -RIn \"await import\\(\" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle",
      "grep -RInE \"console\\.(warn|error)\\(\" tests | grep -v \"tests/utils/console.js\""
    ]
  },
  "logDiscipline": {
    "forbidUnsuppressed": true,
    "muteHelper": "withMutedConsole",
    "spyHelper": "vi.spyOn"
  },
  "prRules": {
    "requireTaskContract": true,
    "requireFilesChangedList": true,
    "requireVerificationSummary": true,
    "requireRiskNote": true
  },
  "verificationChecklist": [
    "prettier/eslint/jsdoc PASS",
    "vitest + playwright PASS",
    "no unsuppressed logs",
    "tests: happy + edge",
    "CI green"
  ]
}
```
