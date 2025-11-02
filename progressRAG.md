# Local RAG MCP Server

This document outlines the architecture and implementation of JU-DO-KON!'s RAG (Retrieval-Augmented Generation) capabilities, wrapped in a local Model Context Protocol (MCP) server. This server enables MCP-aware agents (e.g., Claude Desktop, GitHub Copilot) to perform semantic searches over project documentation, code patterns, and game data through a standardized interface.

**Status**: ✅ **Implemented**

The JU-DO-KON! project features a working MCP RAG server located at `scripts/mcp-rag-server.mjs`. It exposes the `query_rag` tool and several judoka-specific tools for semantic search, filtering, and data retrieval.

**Key Benefits**:

- 📡 **Standardized Interface**: MCP-compliant agents can access RAG without custom integrations.
- 🔍 **Semantic Search**: Natural language queries over vector embeddings.
- 🎯 **Modular Architecture**: Separation of concerns between data, embeddings, and query logic.
- 🔐 **Local-First**: Uses `StdioServerTransport` for secure, process-based communication with no network exposure.

## Architecture

The MCP server exposes the following tools to a connected agent:

### Available Tools

-   `query_rag`: Performs a semantic search over the RAG vector database. It accepts a `query` string and returns ranked results from documentation and code patterns.
-   `judokon.search`: A specialized semantic search over judoka embeddings. It accepts a `query`, a `topK` limit, and optional `filters` (e.g., `country`, `rarity`, `weightClass`).
-   `judokon.getById`: Fetches the complete record for a judoka by their unique `id`.
-   `judokon.random`: Selects a random judoka, with optional filters.
-   `judokon.compare`: Compares the stats between two judoka.

## Implementation Details

The MCP server is implemented in `scripts/mcp-rag-server.mjs` and can be started with `npm run rag:mcp`.

The implementation includes the following key features:

-   **Query Caching**: An LRU cache (`src/helpers/lruCache.js`) is used to reduce latency for frequent searches.
-   **Query Expansion**: A query expander (`src/helpers/queryExpander.js`) uses synonyms from `src/data/synonyms.json` to improve search relevance.
-   **Advanced Filtering**: The server supports advanced filtering of judoka based on stats, weight, and more, implemented in `src/helpers/advancedFilters.js`.
-   **Random Judoka Selection**: The `judokon.random` tool is implemented in `src/helpers/randomJudoka.js`.
-   **Judoka Comparison**: The `judokon.compare` tool is implemented in `src/helpers/judokaComparison.js`.

## Setup and Deployment

### Starting the MCP Server

To run the RAG MCP server:

```shell
# Start the MCP server
npm run rag:mcp
```

The server will listen on stdio for an MCP client connection.

### Agent Integration

For detailed instructions on how to integrate the MCP server with agents like Claude Desktop, see the "MCP Server Integration Guide" in [AGENTS.md](AGENTS.md).

## Testing

The implementation is covered by a comprehensive test suite, including:

-   **Unit Tests**: `tests/mcp-rag-server.test.js`
-   **Integration Tests**: `tests/mcp-rag-server-integration.test.js`
-   **End-to-End Tests**: `playwright/mcp-rag-server.spec.js`
-   **Helper Tests**: Tests for caching, query expansion, advanced filters, random selection, and comparison helpers are also included in the `tests/` directory.