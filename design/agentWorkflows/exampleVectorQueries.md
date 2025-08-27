# Example Vector Queries

This document shows how AI agents can search the JU-DO-KON! vector database and provides prompt templates for common workflows.
See [`RAG_QUERY_GUIDE.md`](./RAG_QUERY_GUIDE.md) for tag references and additional query patterns.

## Embedding JSON Format

Embeddings are stored in `client_embeddings.json` as an array of objects. Each entry includes the original text along with metadata for retrieval. JSON arrays or objects (for example, tooltip sets or judoka data) are broken apart so every record gets its own vector. **The `embedding` field must be a flat numeric array (e.g. `[0.12, -0.04, ...]`) rather than an object with `dims` or `data`.**

```json
{
  "id": "prdBattleClassic.md#overview",
  "text": "Classic Battle is Ju-Do-Kon!'s introductory mode...",
  "qaContext": "Classic Battle introduces the game's basic one-on-one mode.",
  "embedding": [0.12, -0.04, 0.33, ...],
  "source": "PRD",
  "tags": ["design-doc", "battle", "overview", "what"],
  "version": 1
}
```

- **id** – unique identifier or file reference
- **text** – snippet used to generate the embedding
- **qaContext** – short one-sentence summary used in tooltips or quick answers
- **embedding** – numeric vector (typically ≤384 dimensions)
- **source** – origin of the text (PRD, tooltip, etc.)
- **tags** – optional categories for filtering results. Entries include a broad
  label such as `prd` or `data` along with specific tags like `judoka-data` or
  `design-doc`. The array may also contain an intent tag like `what`.
- **version** – embedding file version

Agents can filter by these tag values when calling `findMatches`.

## Prompt Examples

Agent scripts can import the bundled helper from `src/helpers/vectorSearch/index.js` to query the embeddings programmatically.

```javascript
import vectorSearch from "../../src/helpers/vectorSearch/index.js";
const matches = await vectorSearch.findMatches(vector, 5, ["prd"]);
```

Because embeddings capture semantics, synonyms like "grip fighting" and "kumi-kata" map closely. The demo interface marks scores of 0.6 and above as strong matches and only shows weaker results when no strong hits are returned.
Exact keyword matches earn a small 0.1 score bonus before ranking, so quoting a
term can bump the most literal result to the top.

### QA Agent

```
You are a QA assistant. Search the vector store for requirements on the Settings page. Use the top result titles in your test plan.
Query: "settings feature flags order"
```

To narrow results, pass tag filters to your search call:

```
vectorSearch.findMatches(queryVector, 5, ["judoka-data"]);
```

```
const results = await vectorSearch.findMatches(queryVector, 5);
const context = await vectorSearch.fetchContextById(results[0].id);
```

### Card Generation Agent

```
As a card generation bot, retrieve style notes for judoka bios.
Query: "judoka bio tone guidelines"
```

### Bug Reproduction Agent

```
You debug UI issues. Find references about the navigation bar animation timing.
Query: "navbar button transition duration"
```

## `queryRag` Helper

Use the `queryRag(question)` helper to expand a natural-language question and
fetch the most relevant vector matches before digging through files.

```javascript
import queryRag from "../../src/helpers/queryRag.js";

const matches = await queryRag("How does the battle engine work?");
```

The function handles synonym expansion, embedding generation, and ranking so
agents start with focused context.

## Updating Embeddings

Run `npm run generate:embeddings` whenever you update any PRD, files in
`src/data/`, or markdown under `design/codeStandards` or
`design/agentWorkflows`. The script (`scripts/generateEmbeddings.js`) fetches the
**quantized** `Xenova/all-MiniLM-L6-v2` model on first run, so it requires
internet access unless the model is cached. If the process runs out of memory,
increase Node's heap limit (for example `node --max-old-space-size=8192
scripts/generateEmbeddings.js`). This rebuilds `client_embeddings.json`, now
pretty-printed for easier diffing, so agents search the latest content. Commit
the regenerated JSON file along with your changes.

The vector search page checks each embedding's `version` against the
`CURRENT_EMBEDDING_VERSION` constant provided by `vectorSearch.CURRENT_EMBEDDING_VERSION`.
If a mismatch warning appears, bump the constant and rerun
`npm run generate:embeddings` to refresh both
`client_embeddings.json` and `client_embeddings.meta.json`.

If the result would be larger than 6.8MB, the generator exits with
`"Output exceeds 6.8MB"`. Increase the `CHUNK_SIZE` constant or omit large files to
reduce the output size before running the script again.
