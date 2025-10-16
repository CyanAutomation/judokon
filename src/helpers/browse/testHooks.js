import { appendCards } from "../carousel/index.js";
import { createGokyoLookup } from "../utils.js";
import { addHoverZoomMarkers } from "../setupHoverZoom.js";
import { getTestAPI, isTestMode } from "../testApi.js";

const state = {
  container: null,
  gokyoData: [],
  gokyoLookup: {},
  addedNodes: new Set(),
  animationsDisabled: false,
  previousAnimationValue: null,
  readyResolvers: new Set(),
  isCarouselReady: false
};

function updateInitSnapshot(snapshot) {
  if (!isTestMode()) return;
  try {
    getTestAPI().init?.__updateBrowseReadySnapshot?.(snapshot);
  } catch {}
}

function resetInitSnapshot() {
  if (!isTestMode()) return;
  try {
    getTestAPI().init?.__resetBrowseReadySnapshot?.();
  } catch {}
}

function ensureBrowseTestApi() {
  if (!isTestMode()) return null;

  const testApi = getTestAPI();
  const browseApi = testApi.browse || {
    disableHoverAnimations,
    enableHoverAnimations,
    addCard: addTestCard,
    whenCarouselReady,
    reset: resetState,
    getSnapshot: createReadySnapshot
  };

  testApi.browse = browseApi;

  if (typeof window !== "undefined") {
    window.__TEST_API = testApi;
    window.__TEST_API.browse = browseApi;
  }

  return browseApi;
}

function createReadySnapshot() {
  return {
    isReady: state.isCarouselReady && !!state.container,
    cardCount: state.container?.querySelectorAll?.(".judoka-card").length ?? 0
  };
}

function resolveReadyResolvers() {
  if (!state.container) {
    state.isCarouselReady = false;
    resetInitSnapshot();
    return;
  }
  state.isCarouselReady = true;
  const snapshot = createReadySnapshot();
  updateInitSnapshot(snapshot);
  for (const resolver of Array.from(state.readyResolvers)) {
    try {
      resolver(snapshot);
    } finally {
      state.readyResolvers.delete(resolver);
    }
  }
}

function registerReadyResolver(resolve) {
  const resolver = (snapshot) => {
    resolve(snapshot);
  };
  state.readyResolvers.add(resolver);
  return resolver;
}

/**
 * Provide a promise that resolves when the browse carousel has rendered.
 *
 * @pseudocode
 * 1. If the carousel is already marked ready, resolve immediately with a snapshot.
 * 2. Otherwise register a resolver that will be triggered the next time the
 *    carousel context updates with a rendered container.
 *
 * @returns {Promise<{ isReady: boolean, cardCount: number }>} Snapshot metadata
 * when the carousel is available.
 */
function whenCarouselReady() {
  ensureBrowseTestApi();
  return new Promise((resolve) => {
    const resolver = registerReadyResolver(resolve);

    if (state.isCarouselReady && state.container) {
      state.readyResolvers.delete(resolver);
      resolve(createReadySnapshot());
      return;
    }
  });
}

/**
 * Disable hover animations on the browse page for deterministic testing.
 *
 * @pseudocode
 * 1. Exit early when `document.body` is unavailable.
 * 2. If animations are already disabled, skip further work.
 * 3. Remember the previous value of `data-test-disable-animations` (if any).
 * 4. Set `data-test-disable-animations="true"` on `<body>`.
 * 5. Mark animations as disabled in local state so they can be restored.
 *
 * @returns {void}
 */
function disableHoverAnimations() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body || state.animationsDisabled) return;
  state.previousAnimationValue = body.hasAttribute("data-test-disable-animations")
    ? body.getAttribute("data-test-disable-animations")
    : null;
  body.setAttribute("data-test-disable-animations", "true");
  state.animationsDisabled = true;
}

/**
 * Restore hover animations on the browse page after tests mutate them.
 *
 * @pseudocode
 * 1. Exit early when `<body>` is missing or animations were not disabled.
 * 2. If the body previously lacked the attribute, remove it; otherwise restore the prior value.
 * 3. Clear saved attribute state and mark animations as enabled.
 *
 * @returns {void}
 */
function enableHoverAnimations() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body || !state.animationsDisabled) return;
  if (state.previousAnimationValue === null) {
    body.removeAttribute("data-test-disable-animations");
  } else {
    body.setAttribute("data-test-disable-animations", state.previousAnimationValue);
  }
  state.previousAnimationValue = null;
  state.animationsDisabled = false;
}

/**
 * Append a new judoka card using the production carousel pipeline.
 *
 * @pseudocode
 * 1. Ensure a carousel container has been registered; throw when missing.
 * 2. Record existing direct children of the container so new nodes can be identified later.
 * 3. Run `appendCards(container, [judoka], gokyoLookup)` to build the DOM using real factories.
 * 4. Await the resulting `ready` promise.
 * 5. Re-run `addHoverZoomMarkers()` so the new card gets hover listeners.
 * 6. Track any newly appended nodes so they can be removed during cleanup.
 *
 * @param {import("../types.js").Judoka} judoka - Judoka data used to create the card.
 * @returns {Promise<void>} Resolves when the card has been generated and listeners attached.
 */
async function addTestCard(judoka) {
  if (!state.container) {
    throw new Error("Browse carousel is not ready for test cards.");
  }
  const container = state.container;
  const existing = new Set(container.children);
  const { ready } = appendCards(container, [judoka], state.gokyoLookup);
  await ready;

  let hasNewNodes = false;
  for (const node of container.children) {
    if (!existing.has(node)) {
      state.addedNodes.add(node);
      hasNewNodes = true;
    }
  }

  if (hasNewNodes) {
    addHoverZoomMarkers();
  }
}

/**
 * Remove cards added through the test hook and restore animation state.
 *
 * @pseudocode
 * 1. Re-enable hover animations if they were disabled.
 * 2. Remove any nodes tracked in `addedNodes` that are still attached to the DOM.
 * 3. Clear the `addedNodes` set to avoid leaking references across renders.
 */
function resetState() {
  enableHoverAnimations();
  for (const node of state.addedNodes) {
    const parent = node?.parentElement;
    if (!parent) continue;
    try {
      parent.removeChild(node);
    } catch (error) {
      if (error?.name === "NotFoundError" || error?.message?.includes("not a child")) {
        continue;
      }
      throw error;
    }
  }
  state.addedNodes.clear();
  state.container = null;
  state.gokyoData = [];
  state.gokyoLookup = {};
  state.isCarouselReady = false;
  resetInitSnapshot();
  for (const resolver of Array.from(state.readyResolvers)) {
    try {
      resolver({ isReady: false, cardCount: 0, error: "Test reset before carousel ready" });
    } catch {
      // Ignore resolver errors during cleanup
    }
  }
  state.readyResolvers.clear();
}

/**
 * Update carousel references so the browse test hooks operate on the latest render.
 *
 * @pseudocode
 * 1. Store the provided container and gokyo data in local state.
 * 2. Pre-compute the gokyo lookup when data exists to match production behavior.
 * 3. Clear any tracked nodes so stale references do not affect later resets.
 * 4. Ensure global test helpers are attached to `__TEST_API.browse`.
 *
 * @param {HTMLElement|null} container - Carousel container element.
 * @param {import("../types.js").GokyoEntry[]|undefined} gokyoData - Raw gokyo list.
 * @returns {void}
 */
export function updateBrowseTestHooksContext({ container, gokyoData }) {
  ensureBrowseTestApi();
  state.container = container || null;
  state.gokyoData = Array.isArray(gokyoData) ? gokyoData : [];
  state.gokyoLookup = state.gokyoData.length ? createGokyoLookup(state.gokyoData) : {};
  state.addedNodes.clear();
  if (state.container) {
    resolveReadyResolvers();
  } else {
    state.isCarouselReady = false;
    resetInitSnapshot();
  }
}

/**
 * Reset browse-specific test hooks and remove any injected state.
 *
 * @pseudocode
 * 1. Delegate to `resetState()` so animations and injected cards are cleared.
 *
 * @returns {void}
 */
export function resetBrowseTestHooks() {
  resetState();
}

ensureBrowseTestApi();
