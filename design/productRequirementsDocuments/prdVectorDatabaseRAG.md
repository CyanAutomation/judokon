# PRD: Vector Database for Retrieval-Augmented Generation (RAG)

## Overview (TL;DR)

This PRD defines the implementation of a lightweight vector database for semantic search across JU-DO-KON! assets such as PRDs, tooltips, and game rules. This system supports AI agent workflows (e.g. QA, card generation, bug reproduction, test case creation) by enabling agents to search project data semantically.

By enabling faster and more accurate AI tooling, this feature indirectly enhances game quality and speed of delivery — leading to more balanced cards, faster bug fixes, and smoother releases for JU-DO-KON! players.

---

## Problem Statement / Why It Matters

As the JU-DO-KON! project scales, AI agents increasingly need to reason across scattered data sources (PRDs, JSON configs, tooltips). Current keyword-based methods are brittle, especially when terminology is inconsistent (e.g. “grip fighting” vs. “kumi-kata”). This results in agents producing invalid queries or misclassifying design intents — e.g., test cases missing kumi-kata interactions due to synonyms not being recognized.

Without a semantic memory layer, agents must either parse entire documents from scratch or rely on hardcoded rules — both of which are inefficient and error-prone.

Ultimately, these issues increase the risk of bugs reaching players, slow down the delivery of new cards, and make it harder to maintain design consistency — all of which degrade the play experience for our core audience (kids ages 8–12).

---

## Goals / Success Metrics

- Enable semantic search over project documentation and game data (e.g. PRDs, `judoka.json`, `tooltips.json`)
- Improve agent self-sufficiency by reducing fallback to manual lookups by **30%** (measured via agent query logs)
- Reduce use of hardcoded logic in prompt pipelines by **50%** across test agents
- Provide consistent embedding format usable by in-browser tools or local dev agents

**Success Metrics:**

| Goal | Metric |
|------|--------|
| Response accuracy | ≥90% agent-retrieved responses align with top 3 relevant matches |
| Search latency | ≤200ms average similarity lookup on mid-tier desktop browsers (e.g., 2022 MacBook Air M1 or Windows laptop with 8GB RAM) |
| Coverage | ≥90% of PRDs/tooltips indexed within the system |
| File size | <3MB total JSON size to ensure fast client-side loading |

---

## User Stories

- **As an AI QA agent**, I want to search PRDs semantically so I can generate test plans based on actual feature requirements.
- **As a developer**, I want to retrieve styling or logic guidance from related documents so I don’t duplicate existing work.
- **As a prompt-generation agent**, I want to find consistent naming or stat patterns in `judoka.json` so I can create new cards that fit the house style.
- **As a player support agent**, I want to surface explanations of unfamiliar terms like “Kumi-kata” by searching tooltips and stat descriptions — enabling faster responses to young players.

---

## Prioritized Functional Requirements

| Priority | Feature | Description |
|----------|---------|-------------|
| P1 | Embedding Generator | Create vector embeddings for a corpus of text snippets (tooltips, PRDs, design rules, etc.) using a consistent model (e.g. `MiniLM`, `OpenAI Ada`, or simulated offline encoder) |
| P1 | Client-Side Embedding Store | Save all text entries and their embeddings in a `client_embeddings.json` file for browser use |
| P1 | Cosine Similarity Function | Implement JavaScript logic to compare a query vector to all indexed entries and return top N matches |
| P1 | Static Query Interface | Provide an in-browser demo or utility for querying the embedding file (e.g. using a sample prompt vector) |
| P2 | Vector Metadata Fields | Store source metadata with each embedding (e.g. “source: PRD Tooltip System”, “type: stat-description”) |
| P2 | Agent Integration Example | Provide a sample script or markdown prompt to demonstrate how AI agents can use the vector store |
| P3 | Embedding Refresh Pipeline | Optionally support rebuilding the embedding index when PRDs or tooltip files are updated (manual or script-based trigger) |

### Embedding Refresh Pipeline

After editing PRDs, tooltips, or game rules, run `npm run generate:embeddings` from the repository root. The script at `scripts/generateEmbeddings.js` downloads the `Xenova/all-MiniLM-L6-v2` model the first time it runs, so the command will fail without internet access. Cache the model locally or run it in an environment with a connection. Commit the updated `client_embeddings.json`—now pretty-printed for readability—so other agents work with the latest vectors. A GitHub Actions workflow could automate this regeneration whenever those folders change.

---

## Acceptance Criteria

- [x] `client_embeddings.json` contains ≥5 fields per entry: `id`, `text`, `embedding`, `source`, and optional `tags`
- [x] Vector similarity function returns top 5 matches in ≤200ms on a mid-tier device (e.g. 2022 MacBook Air M1)
- [x] Search works offline in a local browser with no server backend
- [x] At least 30 unique content entries from across the PRDs/tooltips are indexed in the demo build
- [x] Each returned result includes both the match score and a reference to the original source
- [x] Agent prompt templates are provided with guidance on embedding format and retrieval usage
- [x] The system handles malformed or missing embeddings gracefully (e.g. logs a warning or returns empty result)
- [x] The `client_embeddings.json` file stays under the 3MB threshold to ensure quick page load and GitHub Pages compatibility

---

-## Edge Cases / Failure States

- **Missing or Malformed Embeddings**: If an entry lacks a valid embedding, log a warning and skip it during similarity comparison. Surface the message “Embeddings could not be loaded – please check console.”
- **Corrupted JSON File**: Show a fallback message and prevent crashes; disable the query interface if JSON fails to parse.
- **Out-of-Vocabulary Query**: If no results meet the similarity threshold, the UI remains usable and displays “No close matches found.”
- **Version Mismatch**: Add a version field to the JSON file (e.g., `"version": "v1.0"`) and warn if outdated.
- **Invalid Query Vector**: Validate that the query vector matches expected dimensions; handle mismatches with clear error messaging.

---

## Design and UX Considerations

- A simple web UI mockup is shown below.
- Must work offline within GitHub Pages without requiring server-side infrastructure.
- Vector format must be JSON-serializable and readable by JavaScript.
- Embedding dimensionality must be ≤384 for performance.
- UI must support keyboard navigation and screen readers.
- Tap/click targets should be at least 44px height for accessibility.
- Lookup responses must render within 200ms; show loading spinner if delayed.
- Display an error message when embeddings or the model fail to load.
- Show up to five matches with score and source information.

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

### Open Questions:
- Should this feature support live embedding via API (e.g. OpenAI) or remain static?
- Do we want a UI search tool for developers and designers, or agent-only access?
- Should embedding versioning be tracked per file (`v1_embeddings.json`)?

## Tasks

- [ ] 1.0 Build Embedding Generation System
  - [ ] 1.1 Choose embedding model (e.g. MiniLM or OpenAI Ada)
  - [ ] 1.2 Parse `tooltips.json`, PRDs, and `judoka.json`
  - [ ] 1.3 Generate vector embeddings for each entry
  - [ ] 1.4 Save embeddings and metadata into `client_embeddings.json`

- [ ] 2.0 Implement Client-Side Embedding Store
  - [ ] 2.1 Structure JSON with `id`, `text`, `embedding`, `source`, `tags`
  - [ ] 2.2 Ensure total file size stays below the 3MB threshold
  - [ ] 2.3 Validate JSON loading in-browser

- [ ] 3.0 Develop Similarity Search Function
  - [ ] 3.1 Implement cosine similarity in JS
  - [ ] 3.2 Return top 5 matches within 200ms
  - [ ] 3.3 Include score and source reference in response

- [ ] 4.0 Create Static Query Interface
  - [ ] 4.1 Design and implement offline query UI
  - [ ] 4.2 Add keyboard accessibility and result display
  - [ ] 4.3 Provide example queries with results

- [ ] 5.0 Agent Integration and Demos
  - [ ] 5.1 Create markdown prompt templates
  - [ ] 5.2 Provide usage examples with test agents
  - [ ] 5.3 Log agent response coverage and latency
