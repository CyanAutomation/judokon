# Example Vector Queries

This document shows how AI agents can search the JU-DO-KON! vector database and provides prompt templates for common workflows.

## Embedding JSON Format

Embeddings are stored in `client_embeddings.json` as an array of objects. Each entry includes the original text along with metadata for retrieval. JSON arrays or objects (for example, tooltip sets or judoka data) are broken apart so every record gets its own vector. **The `embedding` field must be a flat numeric array (e.g. `[0.12, -0.04, ...]`) rather than an object with `dims` or `data`.**

```json
{
  "id": "prdClassicBattle.md#overview",
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

Agent scripts can import `findMatches` from `src/helpers/vectorSearch.js` to query the embeddings programmatically.

```javascript
import { findMatches } from "../../src/helpers/vectorSearch.js";
const matches = await findMatches(vector, 5, ["prd"]);
```

Because embeddings capture semantics, synonyms like "grip fighting" and "kumi-kata" map closely. The demo interface marks scores of 0.6 and above as strong matches and only shows weaker results when no strong hits are returned.

### QA Agent

```
You are a QA assistant. Search the vector store for requirements on the Settings page. Use the top result titles in your test plan.
Query: "settings feature flags order"
```

To narrow results, pass tag filters to your search call:

```
findMatches(queryVector, 5, ["judoka-data"]);
```

```
const results = await findMatches(queryVector, 5);
const context = await fetchContextById(results[0].id);
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

If the result would be larger than 3.6MB, the generator exits with
`"Output exceeds 3.6MB"`. Increase the `CHUNK_SIZE` constant or omit large files to
reduce the output size before running the script again.
