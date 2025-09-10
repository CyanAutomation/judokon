import { generateRandomCard } from "../randomCard.js";
import { getRandomJudoka } from "../cardUtils.js";
import { loadSettings } from "../settingsStorage.js";
import { isEnabled } from "../featureFlags.js";
import { fetchJson } from "../dataUtils.js";
import { createGokyoLookup } from "../utils.js";
import { DATA_DIR } from "../constants.js";
import { showMessage, showTemporaryMessage } from "../setupScoreboard.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { JudokaCard } from "../../components/JudokaCard.js";
import { getFallbackJudoka } from "../judokaUtils.js";
import { setupLazyPortraits } from "../lazyPortrait.js";

let judokaData = null;
let gokyoLookup = null;
let opponentJudoka = null;
let loadErrorModal = null;

function qaInfo(text) {
  try {
    if (isEnabled("enableTestMode")) {
      const restore = showTemporaryMessage(`[QA] ${text}`);
      // Clear quickly so we don't interfere with round messages
      setTimeout(restore, 1200);
    }
  } catch {}
}

function showLoadError(error) {
  let msg = error?.message || "Unable to load data.";
  if (msg.includes("Cannot access uninitialized variable")) {
    msg = "A critical error occurred during data loading. Please try again.";
  }

  // Try to show message via scoreboard, fallback to direct DOM manipulation
  try {
    showMessage(msg);
  } catch {
    // Fallback: directly set the message in the DOM when scoreboard isn't initialized
    const messageEl = document.getElementById("round-message");
    if (messageEl) {
      messageEl.textContent = msg;
    }
  }

  // Also ensure the message is set directly for tests
  const messageEl = document.getElementById("round-message");
  if (messageEl) {
    messageEl.textContent = msg;
  }
  if (!loadErrorModal) {
    const title = document.createElement("h2");
    title.id = "load-error-title";
    title.textContent = "Load Error";

    const desc = document.createElement("p");
    desc.id = "load-error-desc";
    desc.textContent = msg;

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const retry = createButton("Retry", { id: "retry-draw-button" });
    retry.addEventListener("click", async () => {
      loadErrorModal.close();
      try {
        await drawCards();
      } catch (retryError) {
        console.debug("Failed to retry card draw:", retryError);
        window.location.reload();
      }
    });
    actions.append(retry);

    const frag = document.createDocumentFragment();
    frag.append(title, desc, actions);

    loadErrorModal = createModal(frag, { labelledBy: title, describedBy: desc });
    document.body.appendChild(loadErrorModal.element);
  } else {
    const descEl = loadErrorModal.element.querySelector("#load-error-desc");
    if (descEl) descEl.textContent = msg;
  }
  loadErrorModal.open();
}

/**
 * Draw battle cards for the player and opponent.
 *
 * @pseudocode
 * 1. Load judoka and gokyo data when not cached.
 * 2. Filter out judoka marked `isHidden`.
 * 3. Render a random player card using `generateRandomCard` and store the result.
 * 4. Choose a random opponent judoka avoiding duplicates.
 * 5. If `JudokaCard.render` returns an HTMLElement, render a placeholder card for the opponent with obscured stats; otherwise log an error.
 * 6. Return the selected judoka objects.
 *
 * @returns {Promise<{playerJudoka: object|null, opponentJudoka: object|null}>}
 */
async function ensureJudokaData() {
  if (judokaData) return Array.isArray(judokaData) ? judokaData : [];
  try {
    judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
    return Array.isArray(judokaData) ? judokaData : [];
  } catch (error) {
    showLoadError(error);
    return [];
  }
}

async function ensureGokyoLookup() {
  if (gokyoLookup) return gokyoLookup;
  try {
    const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
    gokyoLookup = createGokyoLookup(gokyoData);
    return gokyoLookup;
  } catch (error) {
    showLoadError(error);
    return createGokyoLookup([]);
  }
}

function pickOpponent(available, playerJudoka) {
  let compJudoka = getRandomJudoka(available);
  if (!playerJudoka) return compJudoka;
  let attempts = 0;
  const maxAttempts = Math.max(available.length || 0, 5);
  while (compJudoka.id === playerJudoka.id && attempts < maxAttempts) {
    compJudoka = getRandomJudoka(available);
    attempts += 1;
  }
  return compJudoka;
}

async function renderOpponentPlaceholder(container, placeholder, enableInspector) {
  if (!container) return;

  // Preserve the debug panel across placeholder re-renders
  const debugPanel = container.querySelector("#debug-panel");

  // Ensure we have a valid judoka object; fall back to the built-in
  // placeholder when data failed to load or is empty.
  let target = placeholder;
  // Do not pre-validate fields here; tests may provide a minimal object.
  // Only fall back when no placeholder was provided at all.
  if (!target) {
    try {
      target = await getFallbackJudoka();
      qaInfo("Using fallback judoka for opponent placeholder");
    } catch {
      // If even the fallback cannot be retrieved, bail silently.
      return;
    }
  }

  try {
    const judokaCard = new JudokaCard(target, gokyoLookup, {
      useObscuredStats: true,
      enableInspector
    });
    if (typeof judokaCard.render === "function") {
      const card = await judokaCard.render();
      if (!(card && typeof card === "object" && card.nodeType === 1)) {
        console.error("JudokaCard did not render an HTMLElement");
        return;
      }
      container.innerHTML = "";
      if (debugPanel) container.appendChild(debugPanel);
      container.appendChild(card);
      // Defer lazy portrait setup when unsupported (e.g., JSDOM)
      if (typeof IntersectionObserver !== "undefined") {
        try {
          setupLazyPortraits(card);
        } catch {}
      }
    }
  } catch (error) {
    // Swallow constructor/render errors to avoid breaking round start; the
    // timer and selection can proceed even if the placeholder fails.
    console.debug("Error rendering JudokaCard placeholder:", error);
  }
}

/**
 * Draw and render player and opponent cards.
 *
 * @pseudocode
 * 1. Ensure judoka and gokyo datasets are loaded (fetch if missing).
 * 2. Filter out hidden judoka and generate a random player card (skip
 *    rendering when no container exists).
 * 3. Pick an opponent that doesn't match the player where possible.
 * 4. Render an opponent placeholder card with obscured stats.
 * 5. Return the selected player and opponent judoka objects.
 *
 * @returns {Promise<{playerJudoka: object|null, opponentJudoka: object|null}>}
 */
export async function drawCards() {
  // Always attempt to load both datasets so retries re-fetch both.
  const allJudoka = await ensureJudokaData();
  const available = allJudoka.filter((j) => !j.isHidden);

  const lookup = await ensureGokyoLookup();
  // If lookup failed completely, bail out; judoka may be empty but we can still proceed.
  if (!lookup) return { playerJudoka: null, opponentJudoka: null };

  const playerContainer = document.getElementById("player-card");
  const opponentContainer = document.getElementById("opponent-card");

  try {
    await loadSettings();
  } catch {}
  const enableInspector = isEnabled("enableCardInspector");

  let playerJudoka = null;
  const skipRender = !playerContainer;
  await generateRandomCard(
    available,
    null,
    playerContainer,
    false,
    (j) => {
      playerJudoka = j;
    },
    { enableInspector, skipRender }
  );

  // Pick an opponent safely; fall back to the built-in judoka when selection fails
  let compJudoka;
  try {
    compJudoka = pickOpponent(available, playerJudoka);
  } catch {
    try {
      compJudoka = await getFallbackJudoka();
      qaInfo("Using fallback judoka for opponent");
    } catch {
      compJudoka = null;
    }
  }
  // Keep the selected opponent even if it is a minimal object.
  // Only fall back when opponent selection failed entirely.
  if (!compJudoka) {
    try {
      compJudoka = await getFallbackJudoka();
      qaInfo("Using fallback judoka for opponent");
    } catch {
      compJudoka = null;
    }
  }
  opponentJudoka = compJudoka;

  // Choose a placeholder based on a stable ID (1) or the opponent.
  // Do not validate here to allow minimal objects during tests.
  let placeholder = allJudoka.find((j) => j.id === 1) || compJudoka;
  if (!placeholder) {
    try {
      placeholder = await getFallbackJudoka();
      qaInfo("Using fallback judoka for opponent placeholder");
    } catch {
      placeholder = null;
    }
  }
  await renderOpponentPlaceholder(opponentContainer, placeholder, enableInspector);

  return { playerJudoka, opponentJudoka };
}

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
/**
 * Return the currently selected opponent judoka, if any.
 *
 * @pseudocode
 * 1. Return the module-scoped `opponentJudoka` variable.
 *
 * @returns {object|null}
 */
export function getOpponentJudoka() {
  return opponentJudoka;
}

/**
 * Clear the stored opponent judoka selection.
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. Set `opponentJudoka` to `null` to forget the previous selection.
 */
export function clearOpponentJudoka() {
  opponentJudoka = null;
}

/**
 * Get the in-memory gokyo lookup (may be null if not loaded).
 *
 * @pseudocode
 * 1. Return the module-scoped `gokyoLookup` value.
 *
 * @returns {Object|null}
 */
export function getGokyoLookup() {
  return gokyoLookup;
}

/**
 * Ensure the gokyo lookup is loaded and return it.
 *
 * @pseudocode
 * 1. If `gokyoLookup` exists, return it.
 * 2. Otherwise call `ensureGokyoLookup()` which fetches and constructs the lookup.
 * 3. Return the (possibly empty) lookup object.
 *
 * @returns {Promise<Object>}
 */
export async function getOrLoadGokyoLookup() {
  return await ensureGokyoLookup();
}

/**
 * Reset module state for tests.
 *
 * @pseudocode
 * 1. Clear cached `judokaData`, `gokyoLookup`, `opponentJudoka`, and `loadErrorModal`.
 *
 * @returns {void}
 */
export function _resetForTest() {
  judokaData = null;
  gokyoLookup = null;
  opponentJudoka = null;
  loadErrorModal = null;
}
