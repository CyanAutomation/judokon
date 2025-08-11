import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

let synonymsPromise;

/**
 * Load the synonym mapping JSON once.
 *
 * @returns {Promise<Record<string, string[]>>} Synonym map or null on failure.
 */
async function loadSynonyms() {
  if (!synonymsPromise) {
    synonymsPromise = fetchJson(`${DATA_DIR}synonyms.json`).catch(() => {
      synonymsPromise = undefined;
      return null;
    });
  }
  return synonymsPromise;
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Expand a query with synonym matches and near spellings.
 *
 * @pseudocode
 * 1. Load the synonym map via `loadSynonyms`.
 * 2. For each mapping key and its synonyms:
 *    - When the query contains the key or is within a Levenshtein distance of 2,
 *      add all mapped terms to the query.
 *    - Also match against each mapped term in the same way.
 * 3. Return the original query plus any additions joined with spaces.
 *
 * @param {string} query - User entered text.
 * @returns {Promise<string>} Expanded query string.
 */
export async function expandQueryWithSynonyms(query) {
  const map = await loadSynonyms();
  if (!map) return query;
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const additions = new Set();
  for (const [key, arr] of Object.entries(map)) {
    const variants = Array.isArray(arr) ? arr : [];
    const all = [key, ...variants];
    const hit = all.some((term) => {
      const t = term.toLowerCase();
      return (
        lower.includes(t) || levenshtein(lower, t) <= 2 || words.some((w) => levenshtein(w, t) <= 2)
      );
    });
    if (hit) {
      variants.forEach((v) => additions.add(v.toLowerCase()));
    }
  }
  const expanded = [...new Set([...words, ...additions])];
  return expanded.join(" ");
}
