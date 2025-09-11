/**
 * Preloads essential assets required for the Meditation page to ensure a
 * smoother user experience by making resources available before they are needed.
 *
 * @summary This asynchronous function fetches the helper image and relevant
 * JSON data files in parallel.
 *
 * @pseudocode
 * 1. Initiate parallel fetch requests for:
 *    a. The helper image (`helperKG1.png`) located in the `assets` directory.
 *    b. The `aesopsFables.json` data file, using `fetchJson` and `DATA_DIR` for its path.
 *    c. The `aesopsMeta.json` data file, also using `fetchJson` and `DATA_DIR`.
 * 2. Use `Promise.all()` to await the completion of all these fetch operations.
 * 3. Wrap the entire operation in a `try...catch` block to gracefully handle any errors that occur during preloading, logging them to the console without re-throwing.
 *
 * @returns {Promise<void>} A promise that resolves once all preload requests have completed, regardless of success or failure.
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
