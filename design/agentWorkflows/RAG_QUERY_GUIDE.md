# RAG Query Guide

This guide helps agents craft effective vector search queries against `client_embeddings.json`.
Use it alongside [`exampleVectorQueries.md`](./exampleVectorQueries.md) for practical patterns.

## Template Prompts

- "Search test expectations for [feature]"
- "UI rendering for [component]"
- "Locate PRD notes about [topic]"

## Tag Filters

Each embedding can include tags for:

- **Construct type** – `function`, `class`, `variable`, `test`
- **Role** – `component`, `config`, `utility`, `test`
- **Source/topic** – `prd`, `data`, `design-doc`, `judoka-data`, `tooltip`

Combine tags to narrow results:

```javascript
import vectorSearch from "../../src/helpers/vectorSearch/index.js";
const vec = await vectorSearch.expandQueryWithSynonyms("UI rendering for Scoreboard");
const matches = await vectorSearch.findMatches(vec, 8, ["component", "function"]);
```

Filter for specific test helpers:

```javascript
const q = await vectorSearch.expandQueryWithSynonyms("Search test expectations for battle flow");
const testMatches = await vectorSearch.findMatches(q, 5, ["test", "function"]);
```

Tags are passed as an array. A match must include **all** provided tags.
Mixing construct and role tags makes it easy to target snippets like test functions, UI components, or configuration utilities.
