# Vector Search Workflow

This document outlines the data flow behind the Vector Search page.

1. **Query expansion and encoding** – `buildQueryVector` splits the user's
   query into terms, expands synonyms via `vectorSearch.expandQueryWithSynonyms`,
   and uses the MiniLM extractor to generate an embedding vector.
2. **Match selection** – `vectorSearch.findMatches` returns scored results which
   `selectTopMatches` partitions into strong and weak groups before choosing the
   subset to render.
3. **UI state management** – `applyResultsState` applies one of four declarative
   states (`loading`, `results`, `empty`, `error`) to control spinner visibility
   and messaging.
4. **Orchestration** – `handleSearch` composes the above steps, updating the UI
   and rendering results once matches are available.

The workflow keeps heavy logic out of the DOM layer and enables unit testing of
pure utilities.
