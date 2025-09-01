# Scripts

## buildOfflineRag.mjs

Converts `client_embeddings.json` into compact assets for offline vector search.

### Usage

```bash
npm run build:offline-rag
```

This writes:
- `src/data/offline_rag_vectors.bin` – binary Int8 vectors
- `src/data/offline_rag_metadata.json` – JSON metadata matching vector order
