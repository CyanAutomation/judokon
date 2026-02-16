# RAG Tooling Retirement Notes

_Last updated: 2026-02-16_

The repository retired local RAG tooling and related validation/evaluation scripts.

## Removed scripts

- `scripts/mcp-rag-server.mjs`
- `scripts/queryRagCli.mjs`
- `scripts/checkRagPreflight.mjs`
- `scripts/checkRagModel.mjs`
- `scripts/buildOfflineRag.mjs`
- `scripts/validateRagConfig.mjs`
- `scripts/ragHealth.mjs`
- `scripts/prepareLocalModel.mjs`
- `scripts/generateEmbeddings.js`
- `scripts/buildRagManifest.js`
- `scripts/evaluation/evaluateRAG.js`
- `scripts/evaluation/README.md`
- `scripts/evaluation/queries.json`

## Removed tests

- `tests/mcp-rag-server-integration.test.js`
- `tests/mcp-rag-server.mock-tools.test.js`

## Notes

- Historical context for RAG requirements remains in archived status/PRD documents.
- Any prior command references should now point here instead of executable scripts.
