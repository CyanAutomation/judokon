/**
 * Lazily loads and returns a singleton HTML sanitizer instance (DOMPurify).
 *
 * @summary This function attempts to load DOMPurify from various sources
 * (bare specifier, CDN, local node_modules path) to ensure it works across
 * different environments (Vitest, GitHub Pages, local development). If all
 * attempts fail, it falls back to a minimal, built-in sanitizer.
 *
 * @pseudocode
 * 1. If a `cached` sanitizer instance already exists, return it immediately.
 * 2. Define an asynchronous helper function `tryLoad(specifier)`:
 *    a. Attempt to dynamically `import(specifier)`.
 *    b. Extract the default export or the module itself.
 *    c. If the imported module is a function, call it with `window` to instantiate (for DOMPurify).
 *    d. If the instance has a `sanitize` method, return it.
 *    e. On any error during import or instantiation, return `null`.
 * 3. Attempt to load DOMPurify using `tryLoad` with the bare specifier `"dompurify"`. If successful, cache and return the instance.
 * 4. If the bare specifier fails, attempt to load from a CDN URL (`"https://esm.sh/dompurify@3.2.6"`). If successful, cache and return.
 * 5. If the CDN fails, attempt to load from a local `node_modules` path (`"/node_modules/dompurify/dist/purify.es.js"`). If successful, cache and return.
 * 6. If all loading attempts fail, define a `sanitizeBasic` fallback function:
 *    a. This function performs basic HTML sanitization by removing script/style tags, inline event handlers, and stripping attributes from non-allowed tags (`br`, `strong`, `em`).
 *    b. Cache and return an object `{ sanitize: sanitizeBasic }`.
 *
 * @returns {Promise<{ sanitize: (html:string)=>string }>} A promise that resolves to an object with a `sanitize` method.
 */
export async function getSanitizer() {
  // Module-level singleton cache

  var cached;
  try {
    // Preserve existing cached instance across calls within this module scope
    // by storing on the function object when available.
    if (getSanitizer.__cached) return getSanitizer.__cached;
    cached = getSanitizer.__cached;
  } catch {}
  if (cached) return cached;

  async function tryLoad(specifier) {
    try {
      const mod = await import(specifier);
      const maybe = mod?.default ?? mod;
      const instance =
        typeof maybe === "function"
          ? maybe(typeof window !== "undefined" ? window : undefined)
          : maybe;
      if (instance && typeof instance.sanitize === "function") return instance;
    } catch {
      // ignore and try next
    }
    return null;
  }

  // Prefer bare specifier (compatible with Vitest; production static servers use native module resolution)
  const viaBare = await tryLoad("dompurify");
  if (viaBare) {
    getSanitizer.__cached = viaBare;
    return (cached = viaBare);
  }

  // Prefer CDN for GitHub Pages (no node_modules on server)
  const viaCDN = await tryLoad("https://esm.sh/dompurify@3.2.6");
  if (viaCDN) {
    getSanitizer.__cached = viaCDN;
    return (cached = viaCDN);
  }

  // Fallback for raw static servers used in Playwright dev servers
  const viaPath = await tryLoad("/node_modules/dompurify/dist/purify.es.js");
  if (viaPath) {
    getSanitizer.__cached = viaPath;
    return (cached = viaPath);
  }

  // Final fallback: minimal allowlist sanitizer good enough for tests
  cached = { sanitize: sanitizeBasic };
  getSanitizer.__cached = cached;
  return cached;
}

const BASIC_ALLOW = new Set(["br", "strong", "em"]);

/**
 * Performs a deterministic allowlist-based sanitization suitable for tests.
 *
 * @summary Removes executable markup (script/style tags, inline handlers) and
 * only preserves very small subset of formatting tags while escaping all other
 * HTML so that it renders as text.
 * @pseudocode
 * 1. Coerce input to string.
 * 2. Remove paired <script>/<style> blocks and any stray opening or closing
 *    tags for those elements.
 * 3. Remove inline event handler attributes (quoted or unquoted values).
 * 4. Escape any tag that is not in the BASIC_ALLOW list; strip attributes from
 *    allowed tags while preserving their structure.
 * 5. Return the sanitized string.
 *
 * @param {unknown} input
 * @returns {string}
 */
function sanitizeBasic(input) {
  const str = String(input ?? "");
  // Remove script/style blocks completely, including nested content
  let out = str
    .replace(/<\s*(?:script|style)\b[^>]*>[\s\S]*?<\s*\/\s*(?:script|style)\s*>/gi, "")
    .replace(/<\s*\/\s*(?:script|style)\s*>/gi, "")
    .replace(/<\s*(?:script|style)\b[^>]*>/gi, "");
  // Drop inline event handlers (quoted or unquoted values)
  out = out.replace(
    /\son[a-z0-9:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ""
  );
  // Allow only a small set of tags and strip attributes
  out = out.replace(/<\/?([a-z][a-z0-9:-]*)\b[^>]*>/gi, (m, tag) => {
    const t = String(tag).toLowerCase();
    if (!BASIC_ALLOW.has(t)) {
      return m.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    // Keep tag but remove attributes
    const isEnd = m.startsWith("</");
    return isEnd ? `</${t}>` : `<${t}>`;
  });
  return out;
}

export const __TEST_ONLY__ = { sanitizeBasic };
