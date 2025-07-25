# PRD: Vector Database for Retrieval-Augmented Generation (RAG)

## Overview (TL;DR)

This PRD defines the implementation of a lightweight vector database for semantic search across JU-DO-KON! assets such as PRDs, tooltips, and game rules. This system supports AI agent workflows (e.g. QA, code generation, test case generation) by enabling agents to search project data semantically. The database will be built offline and queried statically within the browser or via lightweight functions, supporting both in-browser and local development agents.

---

## Problem Statement / Why It Matters

As the JU-DO-KON! project scales, AI agents increasingly need to reason across scattered data sources (PRDs, JSON configs, tooltips). Current keyword-based methods are brittle, especially when terminology is inconsistent (e.g. “grip fighting” vs. “kumi-kata”). This results in agents producing invalid queries or misclassifying design intents — e.g., test cases missing kumi-kata interactions due to synonyms not being recognized.

Without a semantic memory layer, agents must either parse entire documents from scratch or rely on hardcoded rules — both of which are inefficient and error-prone.

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
| File size | <1MB total JSON size for client-side compatibility |

---

## User Stories

- **As an AI QA agent**, I want to search PRDs semantically so I can generate test plans based on actual feature requirements.
- **As a developer**, I want to retrieve styling or logic guidance from related documents so I don’t duplicate existing work.
- **As a prompt-generation agent**, I want to find consistent naming or stat patterns in `judoka.json` so I can create new cards that fit the house style.
- **As a player support agent**, I want to surface explanations of unfamiliar terms like “Kumi-kata” by searching tooltips and stat descriptions.

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

---

## Acceptance Criteria

- [x] `client_embeddings.json` contains ≥5 fields per entry: `id`, `text`, `embedding`, `source`, and optional `tags`
- [x] Vector similarity function returns top 3 matches in ≤200ms on a mid-tier device (e.g. 2022 MacBook Air M1)
- [x] Search works offline in a local browser with no server backend
- [x] At least 30 unique content entries from across the PRDs/tooltips are indexed in the demo build
- [x] Each returned result includes both the match score and a reference to the original source
- [x] Agent prompt templates are provided with guidance on embedding format and retrieval usage
- [x] The system handles malformed or missing embeddings gracefully (e.g. logs a warning or returns empty result)
- [x] The `client_embeddings.json` file remains <1MB to ensure quick page load and GitHub Pages compatibility

---

## Edge Cases / Failure States

- **Malformed Embeddings**: If an entry is missing an embedding, log a warning and skip it during similarity comparison.
- **Corrupted JSON File**: Show a fallback message and prevent crashes; disable the query interface if JSON fails to parse.
- **Out-of-Vocabulary Query**: Return an empty match list with message: “No close matches found — refine your query.”
- **Version Mismatch**: Add a version field to the JSON file (e.g., `"version": "v1.0"`) and warn if outdated.
- **Invalid Query Vector**: Validate that the query vector matches expected dimensions; handle mismatches with clear error messaging.

---

## Design and UX Considerations

- A simple web UI mockup is shown below.
- Must work offline within GitHub Pages without requiring server-side infrastructure.
- Vector format must be JSON-serializable and readable by JavaScript.
- Embedding dimensionality must be ≤384 for performance.
- UI must support keyboard navigation and screen readers.

### UI Mockup
