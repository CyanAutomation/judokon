/**
 * Preload assets used on the Meditation page.
 *
 * @pseudocode
 * 1. Request the helper image and JSON data in parallel.
 *    - Use `fetch` for the image.
 *    - Use `fetchJson` with `DATA_DIR` for `aesopsFables.json` and `aesopsMeta.json`.
 * 2. Await all requests and quietly log errors.
 *
 * @returns {Promise<void>} Resolves once all preload requests complete.
 */
import { DATA_DIR } from "./constants.js";
import { fetchJson } from "./dataUtils.js";

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function preloadMeditationAssets() {
  try {
    await Promise.all([
      fetch(new URL("../assets/helperKG/helperKG1.png", import.meta.url)),
      fetchJson(`${DATA_DIR}aesopsFables.json`),
      fetchJson(`${DATA_DIR}aesopsMeta.json`)
    ]);
  } catch (error) {
    console.error("Failed to preload meditation assets:", error);
  }
}
