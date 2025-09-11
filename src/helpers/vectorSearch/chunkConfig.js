/**
 * Defines the maximum number of characters allowed in a single chunk when
 * splitting larger texts for the purpose of generating embeddings and
 * performing vector search.
 *
 * @summary This constant sets an upper limit on the size of text segments
 * processed by the chunking algorithm.
 *
 * @description
 * Chunking algorithms should prioritize splitting text at natural boundaries,
 * such as sentence endings or markdown headings, before strictly enforcing
 * this character limit. This helps maintain the semantic integrity of each chunk.
 *
 * @pseudocode
 * 1. When a document's content exceeds `CHUNK_SIZE`, the chunking process divides it into smaller segments.
 * 2. Each resulting segment will contain at most `CHUNK_SIZE` characters.
 * 3. The algorithm attempts to find logical break points (e.g., end of a sentence, paragraph, or section) within the `CHUNK_SIZE` limit to create more meaningful chunks.
 *
 * @type {number}
 */
export const CHUNK_SIZE = 1000;

/**
 * Defines the fraction (between 0 and 1) of characters that should overlap
 * between consecutive chunks when a document is split for embeddings.
 *
 * @summary This constant helps maintain contextual continuity across chunk
 * boundaries, which is crucial for the accuracy of semantic search results.
 *
 * @description
 * Overlapping chunks ensure that information relevant to a query is not
 * inadvertently split across two separate chunks, thereby improving recall
 * and the overall quality of search results, especially when queries span
 * the boundary of a single chunk.
 *
 * @pseudocode
 * 1. Calculate the absolute overlap size in characters by multiplying `CHUNK_SIZE` by `OVERLAP_RATIO` and rounding down (`Math.floor`).
 * 2. When creating a new chunk, append the last `overlapSize` characters from the preceding chunk to the beginning of the current chunk.
 * 3. This process is applied to all chunks except the very first one.
 *
 * @type {number}
 */
export const OVERLAP_RATIO = 0.2;
