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
/**
 * Maximum characters per chunk when splitting large texts for embeddings and vector indexing.
 *
 * @summary Upper bound on characters per chunk.
 * @description
 * This value controls the upper bound of chunk length. Chunking algorithms
 * should try to split on natural boundaries (sentences/headings) before
 * enforcing this limit.
 *
 * @pseudocode
 * 1. When processing a long document, iterate and produce substrings no larger
 *    than `CHUNK_SIZE` characters.
 * 2. Prefer natural boundaries before splitting to avoid chopping semantic
 *    units (e.g., sentences or markdown headings).
 *
 * @type {number}
 */
export const CHUNK_SIZE = 1000;

/**
 * Fraction (0..1) of characters to overlap between adjacent chunks.
 *
 * @summary Fraction overlapped between consecutive chunks.
 * @description
 * Overlap preserves context across chunk boundaries for semantic search and
 * improves recall when queries span a boundary.
 *
 * @pseudocode
 * 1. Calculate `overlapSize = Math.floor(CHUNK_SIZE * OVERLAP_RATIO)`.
 * 2. For each chunk after the first, include the last `overlapSize` characters
 *    from the previous chunk at the start of the current chunk.
 *
 * @type {number}
 */
export const OVERLAP_RATIO = 0.2;
