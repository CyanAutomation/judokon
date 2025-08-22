import {
  getOpponentJudoka,
  clearOpponentJudoka,
  getGokyoLookup,
  getOrLoadGokyoLookup
} from "./cardSelection.js";
import { loadSettings } from "../settingsStorage.js";
import { isEnabled } from "../featureFlags.js";

/**
 * Retrieve and prepare opponent judoka for rendering.
 *
 * @pseudocode
 * 1. Fetch the stored opponent judoka via `getOpponentJudoka`.
 * 2. Obtain gokyo lookup, loading it if necessary.
 * 3. Load settings to read the `enableCardInspector` flag.
 * 4. Clear the stored judoka to avoid leaking state.
 * 5. Return judoka enriched with lookup and inspector flag.
 *
 * @returns {Promise<object|null>} Judoka data with render dependencies.
 */
export async function getOpponentCardData() {
  const judoka = getOpponentJudoka();
  if (!judoka) return null;
  let lookup = getGokyoLookup();
  if (!lookup) {
    lookup = await getOrLoadGokyoLookup();
    if (!lookup) return null;
  }
  try {
    await loadSettings();
  } catch {}
  const enableInspector = isEnabled("enableCardInspector");
  clearOpponentJudoka();
  return { ...judoka, lookup, enableInspector };
}

export default { getOpponentCardData };
