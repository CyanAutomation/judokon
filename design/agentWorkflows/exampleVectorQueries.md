# Example Vector Queries

This document shows how AI agents can search the JU-DO-KON! vector database and provides prompt templates for common workflows.

## Embedding JSON Format

Embeddings are stored in `client_embeddings.json` as an array of objects. Each entry includes the original text along with metadata for retrieval:

```json
{
  "id": "prdClassicBattle.md#overview",
  "text": "Classic Battle is Ju-Do-Kon!'s introductory mode...",
  "embedding": [0.12, -0.04, 0.33, ...],
  "source": "PRD",
  "tags": ["battle", "overview"],
  "version": 1
}
```

- **id** – unique identifier or file reference
- **text** – snippet used to generate the embedding
- **embedding** – numeric vector (typically ≤384 dimensions)
- **source** – origin of the text (PRD, tooltip, etc.)
- **tags** – optional categories for filtering results
- **version** – embedding file version

## Prompt Examples

### QA Agent

```
You are a QA assistant. Search the vector store for requirements on the Settings page. Use the top result titles in your test plan.
Query: "settings feature flags order"
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

Run `npm run generate:embeddings` whenever you update documentation or data files. The script (`scripts/generateEmbeddings.js`) fetches the `Xenova/all-MiniLM-L6-v2` model on first run, so it requires internet access unless the model is cached. This rebuilds `client_embeddings.json`, now pretty-printed for easier diffing, so agents search the latest content. Commit the regenerated JSON file along with your changes.
