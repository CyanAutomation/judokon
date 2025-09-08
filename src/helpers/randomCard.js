import { fetchJson } from "./dataUtils.js";
import { createGokyoLookup } from "./utils.js";
import { getRandomJudoka } from "./cardUtils.js";
import { hasRequiredJudokaFields } from "./judokaValidation.js";
import { DATA_DIR } from "./constants.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { JudokaCard } from "../components/JudokaCard.js";
import { setupLazyPortraits } from "./lazyPortrait.js";
import { markSignatureMoveReady } from "./signatureMove.js";

/**
 * Replaces the contents of an element with the given card and animates it.
 *
 * @pseudocode
 * 1. Exit early if `element` or `card` is missing.
 * 2. Clear `element` and append `card` to it.
 * 3. If motion is allowed, add the `animate-card` class on the next frame.
 *
 * @param {HTMLElement} element - DOM element to contain the card.
 * @param {HTMLElement} card - The card element to display.
 * @param {boolean} [skipAnimation=false] - Skip the entry animation when true.
 * @private
 */
function displayCard(element, card, skipAnimation = false) {
  if (!element || !card) return;
  element.innerHTML = "";
  element.appendChild(card);
  if (card.querySelector(".signature-move-container")) {
    markSignatureMoveReady();
  }
  setupLazyPortraits(card);
  if (!skipAnimation) {
    requestAnimationFrame(() => {
      card.classList.add("animate-card");
    });
  }
}

/**
 * Loads gokyo data and returns a lookup object.
 *
 * @pseudocode
 * 1. Use `gokyoData` or fetch `gokyo.json`.
 * 2. Build lookup with `createGokyoLookup`.
 * 3. On failure, log error, build minimal lookup, and notify user.
 *
 * @param {GokyoEntry[]} [gokyoData] - Preloaded gokyo data.
 * @returns {Promise<Object<string, GokyoEntry>>} Lookup of gokyo moves.
 */
export async function loadGokyoLookup(gokyoData) {
  try {
    const gokyo = gokyoData || (await fetchJson(`${DATA_DIR}gokyo.json`));
    return createGokyoLookup(gokyo);
  } catch (gokyoError) {
    console.error("Error loading gokyo data:", gokyoError);
    const lookup = createGokyoLookup([{ id: 0, name: "Jigoku-guruma" }]);
    try {
      const { showSnackbar } = await import("./showSnackbar.js");
      showSnackbar("Move list unavailable; using fallback data");
    } catch (notifyError) {
      console.warn("Unable to notify about missing gokyo data:", notifyError);
    }
    return lookup;
  }
}

/**
 * Selects a judoka from data or falls back to the default.
 *
 * @pseudocode
 * 1. Use `activeCards` or fetch `judoka.json`.
 * 2. Filter out hidden or invalid entries.
 * 3. Choose a random judoka and invoke `onSelect`.
 * 4. On failure, return fallback judoka and invoke `onSelect`.
 *
 * @param {Judoka[]} [activeCards] - Preloaded judoka data.
 * @param {function} [onSelect] - Callback for the chosen judoka.
 * @returns {Promise<Judoka>} The selected or fallback judoka.
 */
export async function pickJudoka(activeCards, onSelect) {
  try {
    const judokaData = activeCards || (await fetchJson(`${DATA_DIR}judoka.json`));
    const validJudoka = Array.isArray(judokaData)
      ? judokaData.filter((j) => !j.isHidden && hasRequiredJudokaFields(j))
      : [];
    if (validJudoka.length === 0) {
      throw new Error("No valid judoka entries found");
    }
    const selectedJudoka = getRandomJudoka(validJudoka);
    if (typeof onSelect === "function") {
      onSelect(selectedJudoka);
    }
    return selectedJudoka;
  } catch (error) {
    console.error("Error selecting judoka:", error);
    const fallbackJudoka = await getFallbackJudoka();
    if (typeof onSelect === "function") {
      onSelect(fallbackJudoka);
    }
    return fallbackJudoka;
  }
}

/**
 * Renders a card for the specified judoka and appends it to the container.
 *
 * @pseudocode
 * 1. Build a `JudokaCard` for `judoka`.
 * 2. When rendering succeeds, display the card.
 * 3. Log and ignore any rendering errors.
 *
 * @param {Judoka} judoka - Judoka data used to build the card.
 * @param {Object<string, GokyoEntry>} gokyoLookup - Lookup of gokyo moves.
 * @param {HTMLElement} containerEl - Element to contain the card.
 * @param {boolean} prefersReducedMotion - Motion preference flag.
 * @param {boolean} [enableInspector] - Enable inspector feature.
 * @returns {Promise<void>} Resolves when rendering completes.
 */
export async function renderJudokaCard(
  judoka,
  gokyoLookup,
  containerEl,
  prefersReducedMotion,
  enableInspector
) {
  if (!containerEl) return;
  try {
    const card = await new JudokaCard(judoka, gokyoLookup, { enableInspector }).render();
    if (card) {
      displayCard(containerEl, card, prefersReducedMotion);
    }
  } catch (error) {
    console.error("Error displaying card:", error);
  }
}

/**
 * Generates a random judoka card and appends it to a container element.
 *
 * @pseudocode
 * 1. Ensure judoka data is available:
 *    - If `activeCards` is undefined, fetch `judoka.json` and filter out hidden
 *      or incomplete entries.
 * 2. Ensure gokyo data is available:
 *    - Use the provided `gokyoData` or fetch `gokyo.json`.
 *    - Create a lookup object with `createGokyoLookup`.
 *    - On failure, build a minimal lookup and notify the user.
 * 3. Select a random judoka using `getRandomJudoka` and invoke `onSelect`
 *    with the chosen judoka when provided.
 * 4. Unless `options.skipRender` is true, build and display the card using
 *    `JudokaCard` and `displayCard`.
 * 5. On any error, log the issue and load the fallback judoka using
 *    `getFallbackJudoka()`, then optionally display its card and log any
 *    display error.
 *
 * @param {Judoka[]} [activeCards] - Preloaded judoka data.
 * @param {GokyoEntry[]} [gokyoData] - Preloaded gokyo data.
 * @param {HTMLElement} containerEl - Element to contain the card.
 * @param {boolean} [prefersReducedMotion=false] - Motion preference flag.
 * @param {function} [onSelect] - Callback invoked with the chosen judoka.
 * @param {{enableInspector?: boolean, skipRender?: boolean}} [options] - Feature flags.
 * @returns {Promise<void>} Resolves when the card is appended.
 */
export async function generateRandomCard(
  activeCards,
  gokyoData,
  containerEl,
  prefersReducedMotion = false,
  onSelect,
  options = {}
) {
  const { enableInspector, skipRender = false } = options;
  if (!skipRender && !containerEl) return;

  const gokyoLookup = await loadGokyoLookup(gokyoData);
  const judoka = await pickJudoka(activeCards, onSelect);

  if (!skipRender && containerEl) {
    await renderJudokaCard(
      judoka,
      gokyoLookup,
      containerEl,
      prefersReducedMotion,
      enableInspector
    );
  }
}
