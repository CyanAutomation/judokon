# PRD: Vector Database for Retrieval-Augmented Generation (RAG)

## TL;DR

This PRD defines the implementation of a lightweight vector database for semantic search across JU-DO-KON! assets such as PRDs, tooltips, and game rules. **RAG (Retrieval-Augmented Generation)** is an AI technique that combines semantic search with generative models, allowing agents to fetch relevant context from a database and use it to generate more accurate answers or suggestions. This system supports AI agent workflows (e.g. QA, card generation, bug reproduction, test case creation) by enabling agents to search project data semantically and provide context-aware responses. The feature integrates with AI chatbots, agent tools, and developer utilities for content search, hint generation, and automated reasoning.

---

## Glossary

- **RAG (Retrieval-Augmented Generation):** An AI technique that retrieves relevant information from a database and augments generative model outputs with that context, improving accuracy and relevance.
- **Vector Database:** A database that stores text or data as high-dimensional vectors (embeddings) for fast semantic similarity search.
- **Embedding:** A numerical representation of text or data used for similarity comparison in AI workflows.

---

## Problem Statement / Why It Matters

As the JU-DO-KON! project scales, AI agents increasingly need to reason across scattered data sources (PRDs, JSON configs, tooltips). Current keyword-based methods are brittle, especially when terminology is inconsistent (e.g. “grip fighting” vs. “kumi-kata (grip fighting)”). This results in agents producing invalid queries or misclassifying design intents — e.g., test cases missing kumi-kata interactions due to synonyms not being recognized.

Without a semantic memory layer, agents must either parse entire documents from scratch or rely on hardcoded rules — both of which are inefficient and error-prone.

Ultimately, these issues increase the risk of bugs reaching players, slow down the delivery of new cards, and make it harder to maintain design consistency — all of which degrade the play experience for our core audience (kids ages 8–12).

---

## Goals / Success Metrics

- Enable semantic search over project documentation and game data (e.g. PRDs, `judoka.json`, `tooltips.json`)
- Improve agent self-sufficiency by reducing fallback to manual lookups by **30%** (measured via agent query logs)
- Reduce use of hardcoded logic in prompt pipelines by **50%** across test agents
- Provide consistent embedding format usable by in-browser tools or local dev agents

**Success Metrics:**

| Goal              | Metric                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Response accuracy | ≥90% agent-retrieved responses align with top 3 relevant matches                                                         |
| Search latency    | ≤200ms average similarity lookup on mid-tier desktop browsers (e.g., 2022 MacBook Air M1 or Windows laptop with 8GB RAM) |
| Coverage          | ≥90% of PRDs/tooltips indexed within the system                                                                          |
| File size         | <12.8mb total JSON size to ensure fast client-side loading                                                                |

---

## User Stories

- **As an AI QA agent**, I want to search PRDs semantically so I can generate test plans based on actual feature requirements.
- **As a developer**, I want to retrieve styling or logic guidance from related documents so I don’t duplicate existing work.
- **As a prompt-generation agent**, I want to find consistent naming or stat patterns in `judoka.json` so I can create new cards that fit the house style.
- **As a player support agent**, I want to surface explanations of unfamiliar terms like “Kumi-kata” by searching tooltips and stat descriptions — enabling faster responses to young players.

---

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                                                                                                                                                                                                                                                                                                     |
| -------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Embedding Generator         | Create vector embeddings for a corpus of text snippets (tooltips, PRDs, design rules, etc.) using a consistent model (e.g. `MiniLM`, `OpenAI Ada`, or simulated offline encoder)                                                                                                                                                                |
| P1       | Client-Side Embedding Store | Save all text entries and their embeddings in a `client_embeddings.json` file for browser use                                                                                                                                                                                                                                                   |
| P1       | Cosine Similarity Function  | Implement JavaScript logic to compare a query vector to all indexed entries and return top N matches                                                                                                                                                                                                                                            |
| P1       | Static Query Interface      | Provide an in-browser demo or utility for querying the embedding file (e.g. using a sample prompt vector)                                                                                                                                                                                                                                       |
| P2       | Vector Metadata Fields      | Store source metadata with each embedding (e.g. “source: PRD Tooltip System”, “type: stat-description”). Include granular tags like `judoka-data`, `tooltip`, `design-doc`, or `agent-workflow` for filtering. Tag each entry by its source ("prd","tooltip","data") and by topic such as "judoka","rules","ui" to enable fine-grained queries. |
| P2       | Agent Integration Example   | Provide a sample script or markdown prompt to demonstrate how AI agents can use the vector store                                                                                                                                                                                                                                                |
| P2       | Source Context Retrieval    | Provide helpers so agents can fetch adjacent chunks or the full document using an entry id                                                                                                                                                                                                                                                      |
| P2       | Intent Tagging              | Classify each chunk as _what_, _how_, or _why_ for question filtering                                                                                                                                                                                                                                                                           |
| P3       | Embedding Refresh Pipeline  | Optionally support rebuilding the embedding index when PRDs or tooltip files are updated (manual or script-based trigger)                                                                                                                                                                                                                       |

### Embedding Refresh Pipeline

After editing PRDs, tooltips, game rules, or any markdown under
`design/codeStandards` or `design/agentWorkflows`, run
`npm run generate:embeddings` from the repository root. The script at
`scripts/generateEmbeddings.js` downloads the **quantized** `Xenova/all-MiniLM-L6-v2` model the first time it runs, so the command will fail without internet access. Cache the model locally or run it in an environment with a connection. Commit the updated `client_embeddings.json`—now pretty-printed for readability—so other agents work with the latest vectors. If you hit out-of-memory errors during generation, rerun the command with a higher heap limit (e.g. `node --max-old-space-size=8192 scripts/generateEmbeddings.js`). A GitHub Actions workflow could automate this
regeneration whenever those folders change.

The generator parses JSON arrays and objects into individual snippets so each
record receives its own embedding. For markdown sources, text is chunked from
one heading to the next heading of the same or higher level so each section is
semantically coherent. Each chunk targets roughly **350 tokens** (about **1,400 characters**) with a **15% overlap** and uses
sentence-aware splitting to maintain context. Tooltips, judoka entries, and PRD sections are broken
down into discrete blocks with unique IDs. This granularity improves lookup
accuracy because search results map back to a single section or data row rather
than an entire file.

Chunking rules are shared across tooling via [`src/helpers/vectorSearch/chunkConfig.js`](../../src/helpers/vectorSearch/chunkConfig.js) and follow these guidelines:

- **Goal:** ~350 tokens per chunk (≈1,400 characters).
- **Overlap:** 15% of characters between sequential chunks.
- **Splitting:** Sentence-aware to avoid mid-sentence breaks.

### JSON Field Allowlists and Boilerplate Filtering

The embedding script extracts only approved fields from JSON sources and skips generic text. A field allowlist limits which keys are embedded while boilerplate strings such as "lorem ipsum" are ignored to reduce noise during indexing.

### Deduplication of Normalized Text

Before encoding, each chunk is lowercased, whitespace-collapsed, and checked against previously seen values. Duplicates or empty strings are dropped so the embedding set contains unique, meaningful entries.

### Sharded Embedding Files with a Manifest

Embeddings load through a lightweight manifest that enumerates shard files. The loader fetches each shard listed in `client_embeddings.manifest.json` and flattens them into a single array, falling back to a legacy single-file format if any shard fails.

### Sparse Term-Frequency Vectors for Pre-filtering

Each stored entry also includes a sparse term-frequency vector. Search requests build a similar vector for the query, and a pre-filter step multiplies these sparse vectors to discard entries that share no terms before cosine similarity ranking.

---

## Acceptance Criteria

- The vector database stores all indexed entries as embeddings with metadata, tags, and source references.
- Agents and tools can query the database and receive the top 5 most relevant matches within ≤200ms.
- At least 90% of PRDs/tooltips are indexed and available for semantic search.
- The system supports offline search in the browser with no server backend required.
- Each result includes match score, source, and tags, and can be traced back to the original content.
- The vector database file size remains under 12.8mb for fast client-side loading.
- Malformed or missing embeddings are ignored during search and a warning is logged for each skipped record.
- The system provides helpers for fetching adjacent context or full documents by entry id.
- The UI demo displays the number of loaded embeddings and supports keyboard navigation and accessibility standards.

---

## Edge Cases / Failure States

- **Missing or Malformed Embeddings**: If an entry lacks a valid embedding, log a warning and skip it during similarity comparison. Surface the message “Embeddings could not be loaded – please check console.”
- **Corrupted JSON File**: Show a fallback message and prevent crashes; disable the query interface if JSON fails to parse.
- **Out-of-Vocabulary Query**: If no results meet the similarity threshold, the UI remains usable and displays “No close matches found.”
- **Version Mismatch**: Add a version field to the JSON file (e.g., `"version": "v1.0"`) and warn if outdated.
- **Invalid Query Vector**: Validate that the query vector matches expected dimensions; handle mismatches with clear error messaging.

---

## Design and UX Considerations

- A simple web UI mockup is shown below.
- Must work offline within GitHub Pages without requiring server-side infrastructure.
- When testing locally, serve the repository with `npm start` so the search page can fetch Markdown context files.
- Vector format must be JSON-serializable and readable by JavaScript.
- Embedding dimensionality must be ≤384 for performance.
- Vector values are rounded to three decimal places to minimize size and maintain deterministic comparisons.
- UI must support keyboard navigation and screen readers.
- Tap/click targets should be at least 44px height for accessibility.
- Display an error message when embeddings or the model fail to load.
- Show up to five matches with score, source, and tags information. Each entry displays its optional `qaContext` snippet beneath the match text.
- Search results appear in a responsive table with alternating row colors for readability.
- The Match column is wider than Source, Tags, and Score, which are sized smaller to save space.
- Paths in the Source column break onto new lines at each `/` so long file names remain legible.
- Long match snippets are truncated after roughly 200 characters with a
  "Show more" button that expands the full text within the table row. (**Note:** Truncation and button are styled and logic is present, but ensure UI toggle is fully functional.)
- Embeddings load automatically when the page initializes so the first search runs immediately.
- Matches scoring at least `0.6` are considered strong. When the top match is
  more than `0.4` higher than the next best score, only that top result is
  displayed.
- Scores are normalized to the 0–1 range. Exact term matches (case-insensitive)
  receive a small `+0.1` bonus before sorting to promote literal keyword hits.
- Query text is expanded using `src/data/synonyms.json` so common phrases and near
  spellings map to canonical technique names.
- Lower scoring results appear only when there are no strong matches.
- Result messages such as "No strong matches found…" now use the `.search-result-empty` CSS class. Each result entry uses `.search-result-item` and is fully justified with spacing between items.

### UI Mockup

```
+–––––––––––––––––––––––––––––+
JU-DO-KON! Vector Search
[ Search bar (e.g. “Kumi-kata”) ]  [Search Button]
–––––––––––––––––––––––––––––
Top Matches:
1. “Kumi-kata is a grip fighting technique…” [score]
Source: Tooltip.json
2. “Grip fighting principles are defined in PRD…”
Source: PRD_techniques.md
–––––––––––––––––––––––––––––
```

---

## Player Settings

No user settings or toggles are included. This is appropriate since the feature is meant for development and agent use only. The in-browser demo is fixed-function and does not require configurable options.

---

## Dependencies and Open Questions

### Dependencies:

- Sentence embedding model (e.g. `all-MiniLM-L6-v2`, or simulated offline)
- JSON corpus (e.g. `tooltips.json`, PRDs, `judoka.json`)
- Cosine similarity JS implementation
- `markdownToHtml` helper to display markdown chunks in the browser demo

### Open Questions:

- Should this feature support live embedding via API (e.g. OpenAI) or remain static?
- Do we want a UI search tool for developers and designers, or agent-only access?
- Should embedding versioning be tracked per file (`v1_embeddings.json`)?

## Retrieval Quality Evaluation

Run `node scripts/evaluation/evaluateRAG.js` from the project root to measure retrieval performance. The script reads the representative queries in `scripts/evaluation/queries.json` and reports:

- **MRR@5** – Mean Reciprocal Rank of the expected document within the top five results.
- **Recall@3** – Fraction of queries whose expected document appears in the top three results.
- **Recall@5** – Fraction of queries whose expected document appears in the top five results.

## Tasks

- [x] 1.0 Build Embedding Generation System
  - [x] 1.1 Choose embedding model (e.g. MiniLM or OpenAI Ada)
  - [x] 1.2 Parse `tooltips.json`, PRDs, and `judoka.json`
  - [x] 1.3 Generate vector embeddings for each entry
  - [x] 1.4 Save embeddings and metadata into `client_embeddings.json`
- [x] 2.0 Implement Client-Side Embedding Store
  - [x] 2.1 Structure JSON with `id`, `text`, `embedding`, `source`, `tags`
  - [x] 2.2 Ensure total file size stays below the 12.8mb threshold
  - [x] 2.3 Validate JSON loading in-browser
- [x] 3.0 Develop Similarity Search Function
  - [x] 3.1 Implement cosine similarity in JS
  - [x] 3.2 Return top 5 matches
  - [x] 3.3 Include score and source reference in response
- [x] 4.0 Create Static Query Interface
  - [x] 4.1 Design and implement offline query UI
  - [x] 4.2 Add keyboard accessibility and result display
  - [x] 4.3 Provide example queries with results
  - [x] 4.4 Add tag filter controls so users or agents can restrict results by source or topic
  - [x] 4.5 Truncate long matches in the results table and provide a "Show more" toggle (**Note:** Truncation and button are present, but ensure toggle is fully functional in UI.)
  - [x] 4.6 Show embedding count from the meta file in the UI header
  - [x] 4.7 Display a loading spinner while search is in progress
  - [x] 4.8 Display error messages in the UI when embeddings or results cannot be loaded
  - [x] 4.9 Responsive table layout with alternating row colors
- [x] 5.0 Agent Integration and Demos
  - [x] 5.1 Create markdown prompt templates
  - [x] 5.2 Provide usage examples with test agents
  - [x] 5.3 Log agent response coverage and latency
  - [x] 5.4 Expose a simple API or utility function for programmatic search access
