import { generateRandomCard } from "../randomCard.js";
import { getRandomJudoka } from "../cardUtils.js";
import { loadSettings } from "../settingsStorage.js";
import { isEnabled } from "../featureFlags.js";
import { fetchJson } from "../dataUtils.js";
import { createGokyoLookup } from "../utils.js";
import { DATA_DIR } from "../constants.js";
import { showMessage as scoreboardShowMessage, showTemporaryMessage } from "../setupScoreboard.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { JudokaCard } from "../../components/JudokaCard.js";
import { getFallbackJudoka } from "../judokaUtils.js";
import { setupLazyPortraits } from "../lazyPortrait.js";
import { markSignatureMoveReady } from "../signatureMove.js";
import { applyOpponentCardPlaceholder } from "./opponentPlaceholder.js";

let judokaData = null;
let gokyoLookup = null;
let opponentJudoka = null;
let loadErrorModal = null;

export class JudokaDataLoadError extends Error {
  constructor(message, options = {}) {
    super(message || "Failed to load judoka data");
    this.name = "JudokaDataLoadError";
    if (options && options.cause) {
      this.cause = options.cause;
    }
  }
}

export const CARD_RETRY_EVENT = "classicBattle:retryCardDraw";
export const LOAD_ERROR_EXIT_EVENT = "classicBattle:loadErrorExit";

/**
 * @summary Create and render a JudokaCard using the default card factory.
 *
 * @pseudocode
 * 1. Instantiate a `JudokaCard` with the provided judoka, lookup, and options.
 * 2. Render the card asynchronously to produce an HTMLElement container.
 * 3. Return the rendered element so callers can append it to the DOM.
 *
 * @param {object} judoka - The judoka data object.
 * @param {object} lookup - The gokyo lookup map.
 * @param {object} options - Rendering options forwarded to `JudokaCard`.
 * @returns {Promise<HTMLElement>} Resolves with the rendered card element.
 */
async function defaultCardFactory(judoka, lookup, options) {
  const card = new JudokaCard(judoka, lookup, options);
  return await card.render();
}

/**
 * Display QA information messages during test mode.
 *
 * @param {string} text - The message to display.
 * @summary Show temporary QA debug messages when test mode is enabled.
 * @pseudocode
 * 1. Check if test mode is enabled via feature flag.
 * 2. If enabled, show a temporary message with QA prefix.
 * 3. Clear the message after 1.2 seconds to avoid interfering with round messages.
 *
 * @returns {void}
 */
function qaInfo(text) {
  try {
    if (isEnabled("enableTestMode")) {
      const restore = showTemporaryMessage(`[QA] ${text}`);
      // Clear quickly so we don't interfere with round messages
      setTimeout(restore, 1200);
    }
  } catch {}
}

/**
 * Display load error messages and provide retry functionality.
 *
 * @param {Error} error - The error that occurred during loading.
 * @summary Handle data loading errors with user-friendly messages and retry options.
 * @pseudocode
 * 1. Extract and sanitize the error message.
 * 2. Try to show the message via scoreboard, fallback to direct DOM manipulation.
 * 3. Create or update an error modal with retry button.
 * 4. Handle retry by attempting to redraw cards or reloading the page.
 *
 * @returns {void}
 */
function showLoadError(error) {
  let msg = error?.message || "Unable to load data.";
  if (msg.includes("Cannot access uninitialized variable")) {
    msg = "A critical error occurred during data loading. Please try again.";
  }

  const roundMessage = document.getElementById("round-message");
  // Track whether the round message has been written so we can avoid redundant DOM writes.
  let messageWritten = false;
  try {
    scoreboardShowMessage(msg);
    if (roundMessage?.textContent === msg) {
      messageWritten = true;
    }
  } catch (scoreboardError) {
    console.debug("Failed to show load error on scoreboard:", scoreboardError);
    if (roundMessage) {
      if (roundMessage.textContent !== msg) {
        roundMessage.textContent = msg;
      }
      messageWritten = true;
    }
  }

  if (!messageWritten && roundMessage && roundMessage.textContent !== msg) {
    roundMessage.textContent = msg;
  }

  const createAndShowModal = () => {
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
      const originalLabel = retry.textContent;
      const setLoadingState = (loading) => {
        try {
          retry.disabled = loading;
          if (loading) {
            retry.setAttribute("aria-disabled", "true");
            retry.setAttribute("aria-busy", "true");
            retry.textContent = "Retrying...";
          } else {
            retry.removeAttribute("aria-disabled");
            retry.removeAttribute("aria-busy");
            retry.textContent = originalLabel;
          }
        } catch {}
      };

      retry.addEventListener("click", () => {
        setLoadingState(true);
        try {
          loadErrorModal.close();
        } catch {}
        try {
          if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent(CARD_RETRY_EVENT));
            return;
          }
        } catch (dispatchError) {
          console.debug("Failed to dispatch retry event:", dispatchError);
          setLoadingState(false);
        }
        try {
          if (typeof window !== "undefined" && window.location?.reload) {
            window.location.reload();
          }
        } catch (reloadError) {
          console.debug("Failed to reload after retry dispatch failure:", reloadError);
          setLoadingState(false);
        }
      });
      const exit = createButton("Return to Lobby", { id: "exit-draw-button" });
      exit.addEventListener("click", () => {
        try {
          exit.disabled = true;
          exit.setAttribute("aria-disabled", "true");
          exit.textContent = "Returning...";
        } catch {}
        try {
          loadErrorModal.close();
        } catch {}
        try {
          if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent(LOAD_ERROR_EXIT_EVENT));
          }
        } catch (exitError) {
          console.debug("Failed to dispatch exit event:", exitError);
        }
      });

      actions.append(retry, exit);

      const frag = document.createDocumentFragment();
      frag.append(title, desc, actions);

      loadErrorModal = createModal(frag, { labelledBy: title, describedBy: desc });
      document.body.appendChild(loadErrorModal.element);
    } else {
      const descEl = loadErrorModal.element.querySelector("#load-error-desc");
      if (descEl) descEl.textContent = msg;
    }
    loadErrorModal.open();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createAndShowModal);
  } else {
    createAndShowModal();
  }
}

/**
 * @summary Fetch and cache the judoka dataset needed for card selection.
 *
 * @pseudocode
 * 1. Return cached data immediately when it exists as a non-empty array.
 * 2. Fetch and validate the `judoka.json` payload, throwing for empty or malformed results.
 * 3. Cache the validated dataset and surface load failures through `onError` before propagating.
 * 4. Reset cache to null on any validation failure to ensure fresh attempts.
 *
 * @param {{fetcher?: (path: string) => Promise<any>, onError?: (error: any) => void}} [options]
 * @returns {Promise<object[]>}
 */
export async function loadJudokaData({ fetcher = fetchJson, onError = showLoadError } = {}) {
  if (Array.isArray(judokaData) && judokaData.length > 0) {
    return judokaData;
  }

  judokaData = null;

  try {
    const data = await fetcher(`${DATA_DIR}judoka.json`);

    if (!Array.isArray(data)) {
      throw new JudokaDataLoadError("Invalid judoka dataset received.");
    }
    if (data.length === 0) {
      throw new JudokaDataLoadError("Judoka dataset is empty.");
    }

    judokaData = data;
    return judokaData;
  } catch (error) {
    judokaData = null;
    try {
      onError?.(error);
    } catch {}
    if (error instanceof JudokaDataLoadError) {
      throw error;
    }
    throw new JudokaDataLoadError(error?.message || "Failed to load judoka data", {
      cause: error
    });
  }
}

/**
 * @summary Ensure the gokyo lookup is available and return it.
 *
 * @pseudocode
 * 1. Reuse cached lookup when present.
 * 2. Otherwise fetch `gokyo.json`, create the lookup via the provided factory, and cache it.
 * 3. Surface errors via `onError` and return an empty lookup so callers can continue deterministically.
 *
 * @param {{fetcher?: (path: string) => Promise<any>, lookupFactory?: (data: any) => any, onError?: (error: any) => void}} [options]
 * @returns {Promise<object>}
 */
export async function loadGokyoLookup({
  fetcher = fetchJson,
  lookupFactory = createGokyoLookup,
  onError = showLoadError
} = {}) {
  if (gokyoLookup) return gokyoLookup;
  try {
    const gokyoData = await fetcher(`${DATA_DIR}gokyo.json`);
    gokyoLookup = lookupFactory(gokyoData);
    return gokyoLookup;
  } catch (error) {
    try {
      onError?.(error);
    } catch {}
    return lookupFactory([]);
  }
}

/**
 * @summary Select an opponent judoka distinct from the player when possible.
 *
 * @pseudocode
 * 1. Attempt to pick a random judoka from `availableJudoka` using `randomJudoka`.
 * 2. Retry while the selection matches `playerJudoka` (bounded by pool size).
 * 3. When selection fails, fall back to `fallbackProvider` and log via `qaLogger`.
 *
 * @param {{
 *   availableJudoka?: object[],
 *   playerJudoka?: object|null,
 *   randomJudoka?: (pool: object[]) => object|null,
 *   fallbackProvider?: () => Promise<object>,
 *   qaLogger?: (message: string) => void
 * }} [options]
 * @returns {Promise<object|null>}
 */
export async function selectOpponentJudoka({
  availableJudoka = [],
  playerJudoka = null,
  randomJudoka = getRandomJudoka,
  fallbackProvider = getFallbackJudoka,
  qaLogger = qaInfo,
  onCandidateAccepted,
  onCandidateRejected
} = {}) {
  const pool = Array.isArray(availableJudoka) ? availableJudoka : [];
  const pickRandom = () => {
    if (typeof randomJudoka !== "function") return null;
    try {
      return randomJudoka(pool) || null;
    } catch {
      return null;
    }
  };

  let selection = pickRandom();
  let forcedFallback = false;
  if (playerJudoka) {
    let attempts = 0;
    const maxAttempts = Math.max(pool.length || 0, 5);
    while (selection?.id === playerJudoka.id && attempts < maxAttempts) {
      onCandidateRejected?.(selection, { reason: "sameAsPlayer" });
      selection = pickRandom();
      attempts += 1;
    }
    if (selection?.id === playerJudoka.id || !selection) {
      forcedFallback = true;
      selection = null;
    }
  }

  if (selection) {
    onCandidateAccepted?.(selection, { isFallback: false });
    return selection;
  }

  if (typeof fallbackProvider === "function") {
    try {
      const fallback = await fallbackProvider();
      if (fallback && typeof qaLogger === "function") {
        try {
          qaLogger(
            forcedFallback
              ? "Using fallback judoka after retry exhaustion"
              : "Using fallback judoka for opponent"
          );
        } catch {}
      }
      if (fallback) {
        onCandidateAccepted?.(fallback, { isFallback: true });
      } else {
        onCandidateRejected?.(null, { reason: "fallbackUnavailable" });
      }
      return fallback || null;
    } catch {
      onCandidateRejected?.(null, { reason: "fallbackError" });
      return null;
    }
  }

  onCandidateRejected?.(null, { reason: "noCandidate" });
  return null;
}

/**
 * @summary Reset the opponent card container to the static mystery placeholder.
 *
 * @pseudocode
 * 1. Exit early when `container` is missing.
 * 2. Delegate to `applyOpponentCardPlaceholder()` to replace the DOM contents.
 *
 * @param {{ container?: HTMLElement|null }} [options] - Placeholder rendering options.
 * @returns {Promise<void>}
 */
export async function renderOpponentPlaceholder({ container } = {}) {
  if (!container) return;

  applyOpponentCardPlaceholder(container);
  try {
    container.classList.add("is-obscured");
  } catch {}
}

/**
 * @summary Load card data, generate the player card, select an opponent, and render an obscured placeholder.
 *
 * @pseudocode
 * 1. Attempt to load judoka data while always invoking the gokyo loader to refresh the lookup cache.
 * 2. When judoka data fails or no lookup exists, return null selections so callers can retry safely.
 * 3. Generate the player card while capturing the selected judoka.
 * 4. Select an opponent judoka, persist it, and render the placeholder with preserved debug panel state.
 *
 * @param {{
 *   judokaLoader?: typeof loadJudokaData,
 *   gokyoLoader?: typeof loadGokyoLookup,
 *   fetcher?: (path: string) => Promise<any>,
 *   lookupFactory?: (data: any) => any,
 *   playerContainer?: HTMLElement|null,
 *   opponentContainer?: HTMLElement|null,
 *   containerProvider?: (id: string) => HTMLElement|null,
 *   cardGenerator?: typeof generateRandomCard,
 *   randomJudoka?: typeof getRandomJudoka,
 *   placeholderRenderer?: typeof renderOpponentPlaceholder,
 *   fallbackProvider?: typeof getFallbackJudoka,
 *   loadSettingsFn?: typeof loadSettings,
 *   inspectorFlagReader?: () => boolean,
 *   qaLogger?: (message: string) => void,
 *   cardFactory?: (judoka: object, lookup: object|null, options: {useObscuredStats: boolean, enableInspector: boolean}) => any,
 *   lazyPortraitSetup?: (cardEl: HTMLElement) => void
 * }} [options]
 * @returns {Promise<{playerJudoka: object|null, opponentJudoka: object|null}>}
 */
export async function drawCards(options = {}) {
  const {
    judokaLoader = loadJudokaData,
    gokyoLoader = loadGokyoLookup,
    fetcher = fetchJson,
    lookupFactory = createGokyoLookup,
    playerContainer = options.containerProvider?.("player-card") ??
      options.playerContainer ??
      document.getElementById("player-card"),
    opponentContainer = options.containerProvider?.("opponent-card") ??
      options.opponentContainer ??
      document.getElementById("opponent-card"),
    cardGenerator = generateRandomCard,
    randomJudoka = getRandomJudoka,
    placeholderRenderer = renderOpponentPlaceholder,
    fallbackProvider = getFallbackJudoka,
    loadSettingsFn = loadSettings,
    inspectorFlagReader = () => isEnabled("enableCardInspector"),
    qaLogger = qaInfo,
    cardFactory = defaultCardFactory,
    lazyPortraitSetup,
    opponentSelectionHooks = {}
  } = options;

  let allJudoka = [];
  try {
    allJudoka = await judokaLoader({ fetcher, onError: showLoadError });
  } catch (error) {
    console.error("Failed to load judoka data:", error);
    if (error instanceof JudokaDataLoadError) {
      throw error;
    }
    throw new JudokaDataLoadError(error?.message || "Failed to load judoka data", {
      cause: error
    });
  }
  const lookup = await gokyoLoader({ fetcher, lookupFactory, onError: showLoadError });
  if (!lookup) return { playerJudoka: null, opponentJudoka: null };
  const available = allJudoka.filter((j) => !j?.isHidden);

  try {
    await loadSettingsFn();
  } catch {}
  const enableInspector = !!inspectorFlagReader();

  let playerJudoka = null;
  const skipRender = !playerContainer;
  await cardGenerator(
    available,
    null,
    playerContainer,
    false,
    (judoka) => {
      playerJudoka = judoka;
    },
    { enableInspector, skipRender }
  );

  if (playerJudoka && playerContainer) {
    const clearPlayerContainer = () => {
      try {
        // This is a safer way to clear the container than replaceChildren()
        // or innerHTML, as it avoids some potential event listener and
        // security issues.
        while (playerContainer.firstChild) {
          playerContainer.removeChild(playerContainer.firstChild);
        }
      } catch {
        // Fallback for older browsers or other issues
        playerContainer.innerHTML = "";
      }
    };

    try {
      const cardElement = await cardFactory(playerJudoka, lookup, {
        useObscuredStats: true,
        enableInspector
      });

      const isElement =
        cardElement instanceof HTMLElement ||
        (cardElement &&
          typeof cardElement === "object" &&
          cardElement.nodeType === Node.ELEMENT_NODE);

      if (isElement) {
        // Clear the container before appending the new card.
        // This is a safer way to clear the container than replaceChildren()
        // or innerHTML, as it avoids some potential event listener and
        // security issues.
        while (playerContainer.firstChild) {
          playerContainer.removeChild(playerContainer.firstChild);
        }
        playerContainer.appendChild(cardElement);

        if (cardElement.querySelector(".signature-move-container")) {
          markSignatureMoveReady();
        }
        if (typeof lazyPortraitSetup === "function") {
          lazyPortraitSetup(cardElement);
        } else {
          setupLazyPortraits(cardElement);
        }
      } else if (cardElement !== null) {
        console?.error?.("Card factory did not return an HTMLElement");
        clearPlayerContainer();
      } else {
        clearPlayerContainer();
      }
    } catch (error) {
      console?.error?.("Failed to render player card", error);
      clearPlayerContainer();
    }
  }

  const opponent = await selectOpponentJudoka({
    availableJudoka: available,
    playerJudoka,
    randomJudoka,
    fallbackProvider,
    qaLogger,
    onCandidateAccepted: opponentSelectionHooks.onCandidateAccepted,
    onCandidateRejected: opponentSelectionHooks.onCandidateRejected
  });
  opponentJudoka = opponent;

  await placeholderRenderer({
    container: opponentContainer
  });

  return { playerJudoka, opponentJudoka: opponent };
}

/**
 * @summary Return the currently selected opponent judoka, if any.
 *
 * @pseudocode
 * 1. Return the module-scoped `opponentJudoka` reference.
 *
 * @returns {object|null}
 */
export function getOpponentJudoka() {
  return opponentJudoka;
}

/**
 * @summary Forget the stored opponent judoka selection.
 *
 * @pseudocode
 * 1. Assign `null` to `opponentJudoka` so the next draw starts fresh.
 *
 * @returns {void}
 */
export function clearOpponentJudoka() {
  opponentJudoka = null;
}

/**
 * @summary Read the cached gokyo lookup without triggering a fetch.
 *
 * @pseudocode
 * 1. Return the module-scoped `gokyoLookup` value (may be `null` when not loaded).
 *
 * @returns {Object|null}
 */
export function getGokyoLookup() {
  return gokyoLookup;
}

/**
 * @summary Ensure the gokyo lookup exists and return it.
 *
 * @pseudocode
 * 1. Invoke `loadGokyoLookup()` to reuse the cached lookup or fetch and create it when missing.
 * 2. Return the resulting lookup object (never `null`, possibly empty).
 *
 * @returns {Promise<Object>}
 */
export async function getOrLoadGokyoLookup() {
  return await loadGokyoLookup();
}

/**
 * @summary Reset cached card-selection state so tests start from a clean slate.
 *
 * @pseudocode
 * 1. Set `judokaData`, `gokyoLookup`, `opponentJudoka`, and `loadErrorModal` to `null`.
 *
 * @returns {void}
 */
export function _resetForTest() {
  judokaData = null;
  gokyoLookup = null;
  opponentJudoka = null;
  loadErrorModal = null;
}
