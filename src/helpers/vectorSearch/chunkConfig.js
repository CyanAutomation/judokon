/**
 * Shared chunking configuration for embeddings and vector search.
 *
 * Maximum number of characters to include in a single chunk when splitting
 * long markdown or text for embeddings and vector search.
 *
 * @pseudocode
 * 1. When chunking text, split into pieces no larger than `CHUNK_SIZE`.
 * 2. Sentences or headings may be used as natural boundaries before enforcing this limit.
 */
export const CHUNK_SIZE = 1400;
/**
 * Fraction of characters to overlap between adjacent chunks to preserve
 * context for semantic search (value in range 0..1).
 *
 * @pseudocode
 * 1. Compute overlap size as Math.floor(CHUNK_SIZE * OVERLAP_RATIO).
 * 2. When concatenating adjacent chunks, include the last `overlapSize` chars
 *    from the previous chunk at the start of the next to retain context.
 */
export const OVERLAP_RATIO = 0.15;
