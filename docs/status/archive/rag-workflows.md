# RAG Workflow Archive

RAG-related npm scripts were retired from `package.json`.

For historical context only, prior workflows used project scripts for:

- model hydration
- preflight and health checks
- offline vector build generation
- CLI query and MCP server startup

These commands are no longer supported via `npm run`. If you need to revisit historical implementation details, inspect the relevant files in `scripts/` and RAG helpers in `src/helpers/api/`.
