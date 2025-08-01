import { fetchJson, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

let timersPromise;
let cachedTimers;

async function loadTimers() {
  if (cachedTimers) return cachedTimers;
  if (!timersPromise) {
    timersPromise = fetchJson(`${DATA_DIR}gameTimers.json`).catch(async (err) => {
      console.warn("Failed to fetch gameTimers.json", err);
      return importJsonModule("../data/gameTimers.json");
    });
  }
  cachedTimers = await timersPromise;
  return cachedTimers;
}

/**
 * Retrieve the default timer value for a category.
 *
 * @param {string} category - Timer category to search.
 * @returns {Promise<number|undefined>} Resolved default timer value.
 */
export async function getDefaultTimer(category) {
  const timers = await loadTimers();
  const entry = timers.find((t) => t.category === category && t.default);
  return entry ? entry.value : undefined;
}

export function _resetForTest() {
  timersPromise = undefined;
  cachedTimers = undefined;
}
