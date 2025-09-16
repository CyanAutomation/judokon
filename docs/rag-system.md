# RAG (Retrieval-Augmented Generation) System Guide

This document provides comprehensive guidance on using the JU-DO-KON! vector RAG system for context retrieval and code exploration.

## Overview

Before scanning the repo for answers, call [`queryRag`](../src/helpers/queryRag.js) with a natural-language question to pull relevant context from the embeddings database containing over 2,300 indexed chunks (2,328 currently) covering documentation, code standards, and game rules.

## Basic Usage

```javascript
import queryRag from "./src/helpers/queryRag.js";

const matches = await queryRag("How does the battle engine work?");
```

Check [example vector queries](../design/agentWorkflows/exampleVectorQueries.md) for more usage patterns.

## Vector Search Helpers

Utilities for working with the embedding database are centralized in `src/helpers/vectorSearch/index.js`. The default export provides methods to load embeddings, expand queries, find matches, and fetch surrounding context:

```javascript
import vectorSearch from "./src/helpers/vectorSearch/index.js";
const embeddings = await vectorSearch.loadEmbeddings();
const expanded = await vectorSearch.expandQueryWithSynonyms("grip fighting");
const results = await vectorSearch.findMatches([0, 1, 0], 5, ["prd"], expanded);
```

**Note:** Embeddings are quantized to **three decimal places** to keep file size and comparisons predictable.

See [RAG_QUERY_GUIDE.md](../design/agentWorkflows/RAG_QUERY_GUIDE.md) for template prompts and tag combinations when querying.

## Command Line Interface

### Query RAG from the CLI

Search the vector database directly from the terminal:

```bash
npm run rag:query "How does the battle engine work?"
```

Sample output:

```text
- Classic Battle introduces the game's basic one-on-one mode.
- The round resolver compares chosen stats to decide a winner.
- Each round alternates between player choice and resolver phases.
```

### Evaluate Retrieval Quality

Measure how well the vector search performs by running the evaluator:

```bash
node scripts/evaluation/evaluateRAG.js
```

It reads `scripts/evaluation/queries.json` and reports **MRR@5**, **Recall@3**, and **Recall@5** for the expected sources.

## Offline Usage

### 1. Prepare the Local Model (One-time Setup)

```bash
npm run rag:prepare:models
# or, if you already have a local copy of the files
npm run rag:prepare:models -- --from-dir /path/to/minilm
```

This hydrates `src/models/minilm` with the quantized MiniLM files used by the query encoder.

### 2. Build Compact Assets for Offline Vector Search

```bash
npm run build:offline-rag
```

This writes `src/data/offline_rag_vectors.bin` and `src/data/offline_rag_metadata.json`.

### 3. Query Without Network Connection

```bash
# Enforce strict offline (no CDN/model downloads)
RAG_STRICT_OFFLINE=1 npm run rag:query "How does the battle engine work?"
```

### Offline Tips

- If strict offline is set but the model is missing, the CLI prints a hint to run `npm run rag:prepare:models`.
- If you prefer a degraded but network-free path when the model is unavailable, enable lexical fallback: `RAG_ALLOW_LEXICAL_FALLBACK=1 npm run rag:query "classic battle timer"`.
- The browser path continues to load embeddings via the manifest + shard loader; tests can also consume `client_embeddings.json` directly.

## Performance Metrics

- **⚡ 15x Speed Boost:** 2-second RAG queries vs 30+ seconds of manual exploration
- **🎯 High Accuracy:** 62.5% success rate for implementation queries, 95% for design docs
- **🧠 Comprehensive Coverage:** PRDs, design guidelines, code patterns, and test examples
- **📊 Proven Success:** Currently serving production-level results for architectural queries

## Usage Guidelines for AI Agents

**Default to RAG for ANY question containing:** "How", "Why", "What", "Where", "Which", or when requesting examples/references.

For complete agent guidelines, see [AGENTS.md](../AGENTS.md#rag-retrieval-augmented-generation-policy).

## Related Documentation

- [Vector Search Workflow](./vector-search.md) - UI implementation details for the vector search page
- [RAG Query Guide](../design/agentWorkflows/RAG_QUERY_GUIDE.md) - Template prompts and tag combinations
- [Example Vector Queries](../design/agentWorkflows/exampleVectorQueries.md) - Usage patterns and examples
- [Validation Commands](./validation-commands.md) - Includes RAG validation commands
