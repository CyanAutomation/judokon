import { CHUNK_SIZE, OVERLAP_RATIO } from "./chunkConfig.js";
import { isNodeEnvironment } from "../env.js";

function splitIntoSections(lines) {
  const heading = /^(#{1,6})\s+/;
  const sections = [];
  let i = 0;
  while (i < lines.length && !heading.test(lines[i])) i++;
  if (i > 0) {
    const pre = lines.slice(0, i).join("\n").trim();
    if (pre) sections.push(pre);
  }
  collectHeadingSections(lines, i, sections);
  return sections;
}

function collectHeadingSections(lines, startIdx, out) {
  const heading = /^(#{1,6})\s+/;
  for (let idx = startIdx; idx < lines.length; idx++) {
    const match = heading.exec(lines[idx]);
    if (!match) continue;
    const level = match[1].length;
    let j = idx + 1;
    while (j < lines.length) {
      const next = heading.exec(lines[j]);
      if (next && next[1].length <= level) break;
      j++;
    }
    const section = lines.slice(idx, j).join("\n").trim();
    if (section) out.push(section);
  }
}

function chunkSection(section) {
  if (section.length <= CHUNK_SIZE) return [section];
  const sentences = section.match(/[^.!?]+[.!?]*\s*/g) || [section];
  const baseChunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length > CHUNK_SIZE) {
      if (current) baseChunks.push(current.trim());
      if (sentence.length > CHUNK_SIZE) {
        for (let i = 0; i < sentence.length; i += CHUNK_SIZE) {
          baseChunks.push(sentence.slice(i, i + CHUNK_SIZE).trim());
        }
        current = "";
      } else {
        current = sentence;
      }
    } else {
      current += sentence;
    }
  }
  if (current) baseChunks.push(current.trim());

  const chunks = [];
  const overlapSize = Math.floor(CHUNK_SIZE * OVERLAP_RATIO);
  for (let i = 0; i < baseChunks.length; i++) {
    if (i === 0) {
      chunks.push(baseChunks[i]);
    } else {
      const overlap = baseChunks[i - 1].slice(-overlapSize);
      chunks.push((overlap + baseChunks[i]).slice(0, CHUNK_SIZE));
    }
  }
  return chunks;
}

/**
 * Split markdown text into context-preserving chunks suitable for embeddings.
 *
 * @pseudocode
 * 1. Split the input into lines and divide it into logical sections using
 *    markdown headings as boundaries.
 * 2. For each section, split into sentence-like fragments and assemble
 *    base chunks not exceeding `CHUNK_SIZE`.
 * 3. Prepend an overlapping tail from the previous chunk using `OVERLAP_RATIO`
 *    to preserve context between adjacent chunks.
 * 4. Return an array of chunk strings.
 *
 * @param {string} text - Raw markdown text.
 * @returns {string[]} Array of chunked text fragments.
 */
export function chunkMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const sections = splitIntoSections(lines);
  const chunks = [];
  for (const section of sections) {
    chunks.push(...chunkSection(section));
  }
  return chunks;
}

/**
 * Fetch neighboring context chunks for a given embedding id.
 *
 * @pseudocode
 * 1. Validate that `id` matches the `filename-chunk-N` pattern.
 *    - Return an empty array for invalid ids.
 * 2. Build a URL to the markdown file using the filename.
 * 3. When running in Node (`isNodeEnvironment()`), resolve the file path
 *    with `fileURLToPath` and load it using `fs.promises.readFile`.
 *    Otherwise, fetch the markdown text over HTTP.
 * 4. Split the markdown using `chunkMarkdown` and determine the slice of
 *    chunks around the requested index based on `radius`.
 * 5. Return the selected chunk texts.
 *
 * @param {string} id - Entry identifier like `foo.md-chunk-3`.
 * @param {number} [radius=1] - Number of neighboring chunks to include.
 * @returns {Promise<string[]>} Array of surrounding chunk strings.
 */
export async function fetchContextById(id, radius = 1) {
  const match = /^([^\s]+\.md)-chunk-(\d+)$/.exec(id);
  if (!match) return [];
  const [, filename, num] = match;
  const index = Number(num) - 1;
  try {
    const url = new URL(`../../../design/productRequirementsDocuments/${filename}`, import.meta.url);
    let text;
    if (isNodeEnvironment()) {
      const { fileURLToPath } = await import("node:url");
      const fs = await import("node:fs/promises");
      const filePath = fileURLToPath(url);
      text = await fs.readFile(filePath, "utf8");
    } else {
      const res = await fetch(url.href);
      if (!res.ok) return [];
      text = await res.text();
    }
    const chunks = chunkMarkdown(text);
    const start = Math.max(0, index - radius);
    const end = Math.min(chunks.length, index + radius + 1);
    return chunks.slice(start, end);
  } catch (err) {
    console.error(`Failed to load context from ${filename}`, err);
    return [];
  }
}
