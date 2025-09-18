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
 * @summary Fetch and cache the judoka dataset needed for card selection.
 *
 * @pseudocode
 * 1. If cached data exists, return it as an array (or an empty array when invalid).
 * 2. Otherwise invoke the provided fetcher for `judoka.json` and cache the result.
 * 3. Surface errors via `onError` and resolve with an empty array so the caller can recover.
 *
 * @param {{fetcher?: (path: string) => Promise<any>, onError?: (error: any) => void}} [options]
 * @returns {Promise<object[]>}
 */
export async function loadJudokaData({ fetcher = fetchJson, onError = showLoadError } = {}) {
  if (judokaData) return Array.isArray(judokaData) ? judokaData : [];
  try {
    judokaData = await fetcher(`${DATA_DIR}judoka.json`);
    return Array.isArray(judokaData) ? judokaData : [];
  } catch (error) {
    try {
      onError?.(error);
    } catch {}
    return [];
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
  qaLogger = qaInfo
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
  if (playerJudoka) {
    let attempts = 0;
    const maxAttempts = Math.max(pool.length || 0, 5);
    while (selection?.id === playerJudoka.id && attempts < maxAttempts) {
      selection = pickRandom();
      attempts += 1;
    }
  }

  if (selection) return selection;

  if (typeof fallbackProvider === "function") {
    try {
      const fallback = await fallbackProvider();
      if (fallback && typeof qaLogger === "function") {
        try {
          qaLogger("Using fallback judoka for opponent");
        } catch {}
      }
      return fallback || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * @summary Render the opponent placeholder card while preserving debug UI.
 *
 * @pseudocode
 * 1. Resolve the placeholder judoka from explicit input, dataset, opponent, or fallback provider.
 * 2. Instantiate a `JudokaCard` via the provided factory and ensure it renders an HTMLElement.
 * 3. Replace the container contents (preserving debug panel) and attach lazy portrait observers when supported.
 *
 * @param {{
 *   container?: HTMLElement|null,
 *   allJudoka?: object[],
 *   opponentJudoka?: object|null,
 *   placeholderJudoka?: object|null,
 *   lookup?: object|null,
 *   enableInspector?: boolean,
 *   fallbackProvider?: () => Promise<object>,
 *   qaLogger?: (message: string) => void,
 *   cardFactory?: (judoka: object, lookup: object|null, options: {useObscuredStats: boolean, enableInspector: boolean}) => { render?: () => Promise<HTMLElement>|HTMLElement },
 *   lazyPortraitSetup?: (cardEl: HTMLElement) => void
 * }} [options]
 * @returns {Promise<void>}
 */
export async function renderOpponentPlaceholder({
  container,
  allJudoka = [],
  opponentJudoka = null,
  placeholderJudoka = null,
  lookup = gokyoLookup,
  enableInspector = false,
  fallbackProvider = getFallbackJudoka,
  qaLogger = qaInfo,
  cardFactory = (judoka, lookupArg, options) => new JudokaCard(judoka, lookupArg, options),
  lazyPortraitSetup = setupLazyPortraits
} = {}) {
  if (!container) return;

  const debugPanel = container.querySelector("#debug-panel");
  const dataset = Array.isArray(allJudoka) ? allJudoka : [];

  let target = placeholderJudoka;
  if (!target) target = dataset.find((j) => j && j.id === 1) || null;
  if (!target && opponentJudoka) target = opponentJudoka;

  if (!target && typeof fallbackProvider === "function") {
    try {
      target = await fallbackProvider();
      if (target && typeof qaLogger === "function") {
        try {
          qaLogger("Using fallback judoka for opponent placeholder");
        } catch {}
      }
    } catch {
      return;
    }
  }

  if (!target) return;

  try {
    const cardCreator =
      typeof cardFactory === "function"
        ? cardFactory
        : (judoka, lookupArg, options) => new JudokaCard(judoka, lookupArg, options);
    const cardInstance = cardCreator(target, lookup ?? gokyoLookup, {
      useObscuredStats: true,
      enableInspector
    });

    if (!cardInstance || typeof cardInstance.render !== "function") return;

    const rendered = await cardInstance.render();
    if (!(rendered && typeof rendered === "object" && rendered.nodeType === 1)) {
      console.error("JudokaCard did not render an HTMLElement");
      return;
    }

    container.innerHTML = "";
    if (debugPanel) container.appendChild(debugPanel);
    container.appendChild(rendered);

    if (typeof IntersectionObserver !== "undefined" && typeof lazyPortraitSetup === "function") {
      try {
        lazyPortraitSetup(rendered);
      } catch {}
    }
  } catch (error) {
    console.debug("Error rendering JudokaCard placeholder:", error);
  }
}

/**
 * @summary Load card data, generate the player card, select an opponent, and render an obscured placeholder.
 *
 * @pseudocode
 * 1. Load judoka and gokyo datasets using injectable helpers for deterministic testing.
 * 2. Generate the player card while capturing the selected judoka.
 * 3. Select an opponent judoka and remember it for subsequent reads.
 * 4. Render the opponent placeholder card with preserved debug panel state.
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
    cardFactory,
    lazyPortraitSetup
  } = options;

  const allJudoka = await judokaLoader({ fetcher, onError: showLoadError });
  const available = allJudoka.filter((j) => !j?.isHidden);
  const lookup = await gokyoLoader({ fetcher, lookupFactory, onError: showLoadError });
  if (!lookup) return { playerJudoka: null, opponentJudoka: null };

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

  const opponent = await selectOpponentJudoka({
    availableJudoka: available,
    playerJudoka,
    randomJudoka,
    fallbackProvider,
    qaLogger
  });
  opponentJudoka = opponent;

  await placeholderRenderer({
    container: opponentContainer,
    allJudoka,
    opponentJudoka: opponent,
    lookup,
    enableInspector,
    fallbackProvider,
    qaLogger,
    cardFactory,
    lazyPortraitSetup
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
