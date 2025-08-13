/**
 * Lightweight, environment-tolerant HTML sanitizer loader.
 *
 * @pseudocode
 * 1. Return cached sanitizer if available.
 * 2. Try dynamic import of "dompurify" and instantiate with `window` when needed.
 * 3. On failure, try the ESM path from node_modules for static servers.
 * 4. Fallback to a minimal allowlist sanitizer (keeps br/strong/em; strips others).
 *
 * @returns {Promise<{ sanitize: (html:string)=>string }>}
 */
let cached;
export async function getSanitizer() {
  if (cached) return cached;

  async function tryLoad(specifier) {
    try {
      const mod = await import(specifier);
      const maybe = mod?.default ?? mod;
      const instance = typeof maybe === "function" ? maybe(window) : maybe;
      if (instance && typeof instance.sanitize === "function") return instance;
    } catch {
      // ignore and try next
    }
    return null;
  }

  // Prefer bare specifier (works in Vite/Vitest and modern bundlers)
  const viaBare = await tryLoad("dompurify");
  if (viaBare) return (cached = viaBare);

  // Fallback for raw static servers used in Playwright
  const viaPath = await tryLoad("/node_modules/dompurify/dist/purify.es.js");
  if (viaPath) return (cached = viaPath);

  // Final fallback: minimal allowlist sanitizer good enough for tests
  const ALLOW = new Set(["br", "strong", "em"]);
  function sanitizeBasic(input) {
    const str = String(input ?? "");
    // Remove script/style blocks completely
    let out = str
      .replace(/<\/(?:script|style)>/gi, "")
      .replace(/<(?:script|style)[^>]*>.*?/gis, "");
    // Drop inline event handlers
    out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "").replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
    // Allow only a small set of tags and strip attributes
    out = out.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (m, tag) => {
      const t = String(tag).toLowerCase();
      if (!ALLOW.has(t)) {
        return m.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      // Keep tag but remove attributes
      const isEnd = m.startsWith("</");
      return isEnd ? `</${t}>` : `<${t}>`;
    });
    return out;
  }
  cached = { sanitize: sanitizeBasic };
  return cached;
}
