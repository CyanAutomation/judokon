# RAG Deprecation Notice

- **Removal date:** 2026-02-16
- **Reason:** The project no longer uses a RAG/vector-search runtime in active application flows, and maintaining RAG as a current-state requirement created confusion in architecture and contribution guidance.

## What was removed from active documentation

- Active PRD status for:
  - `design/productRequirementsDocuments/prdVectorDatabaseRAG.md`
  - `design/productRequirementsDocuments/prdAIAgentWorkflows.md`
- Active-document references that treated `client_embeddings.json` and `offline_rag_metadata.json` as normal operational files.
- Current-state architecture and standards statements that required RAG support for active development workflows.

## Where historical docs now live

- `design/productRequirementsDocuments/archive/prdVectorDatabaseRAG.md`
- `design/productRequirementsDocuments/archive/prdAIAgentWorkflows.md`
- Supplementary command/archive history: `docs/status/archive/rag-workflows.md`

## Current policy

- No active app code, tests, or CI requirements should depend on RAG/vector-search artifacts.
- Historical RAG docs are retained for reference only and should not be used as implementation requirements for new work.
