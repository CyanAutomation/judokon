/**
 * Helper to derive a consistent contextPath string for embeddings at generation time.
 * Keep logic minimal and deterministic; mirror of query-time normalization.
 *
 * @param {object} item - { source, tags, section }
 * @returns {string} normalized context path
 */
export function deriveContextPath(item) {
  if (item.contextPath) return item.contextPath;
  const src = String(item.source || "");
  let file = src;
  let bracket = "";
  const bIdx = src.indexOf("[");
  if (bIdx !== -1) {
    file = src.slice(0, bIdx).trim();
    bracket = src.slice(bIdx).replace(/^[\[\s]*|[\]\s]*$/g, "");
  }
  const parts = file.split("/");
  const name = parts[parts.length - 1] || file;
  const domain = parts[0] || "src";
  const base = name
    .replace(/\.(md|js|json)$/i, "")
    .replace(/^prd/i, "")
    .replace(/[-_]/g, " ");
  const tags = Array.isArray(item.tags) ? item.tags.join(" > ") : "";
  const pieces = [domain, base.trim()].filter(Boolean);
  if (tags) pieces.push(tags);
  if (bracket) pieces.push(bracket);
  return pieces.join(" > ").toLowerCase();
}
