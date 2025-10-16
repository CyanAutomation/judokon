import { appendCards } from "../carousel/index.js";
import { createGokyoLookup } from "../utils.js";
import { addHoverZoomMarkers } from "../setupHoverZoom.js";

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

function createReadySnapshot() {
  return {
    isReady: state.isCarouselReady && !!state.container,
    cardCount: state.container?.querySelectorAll?.(".judoka-card").length ?? 0
  };
}

function resolveReadyResolvers() {
  if (!state.container) {
    state.isCarouselReady = false;
    return;
  }
  state.isCarouselReady = true;
  const snapshot = createReadySnapshot();
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
function whenBrowseReady() {
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
 * Await carousel readiness with optional timeout support.
 *
 * @pseudocode
 * 1. Register a readiness resolver.
 * 2. If the carousel is already ready, resolve immediately.
 * 3. Otherwise wait for readiness or reject when the timeout elapses.
 *
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<{ isReady: boolean, cardCount: number }>}
 */
function waitForBrowseReady({ timeout = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    const resolver = registerReadyResolver((snapshot) => {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      resolve(snapshot);
    });

    if (state.isCarouselReady && state.container) {
      state.readyResolvers.delete(resolver);
      resolve(createReadySnapshot());
      return;
    }

    let timerId = null;
    if (Number.isFinite(timeout) && timeout > 0) {
      timerId = setTimeout(() => {
        state.readyResolvers.delete(resolver);
        reject(new Error(`Browse carousel did not become ready within ${timeout}ms`));
      }, timeout);
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
 * Remove cards added through the test API and restore animation state.
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
  for (const resolver of Array.from(state.readyResolvers)) {
    try {
      resolver({ isReady: false, cardCount: 0, error: "Test reset before carousel ready" });
    } catch {
      // Ignore resolver errors during cleanup
    }
  }
  state.readyResolvers.clear();
}

const browseTestApi = {
  disableAnimations: disableHoverAnimations,
  enableAnimations: enableHoverAnimations,
  addCard: addTestCard,
  whenReady: whenBrowseReady,
  waitForReady: waitForBrowseReady,
  getReadyState: createReadySnapshot,
  reset: resetState
};

/**
 * Attach the browse test API to the provided window object.
 *
 * @pseudocode
 * 1. Exit when the provided target is unavailable (e.g., during SSR).
 * 2. Ensure the root `__TEST_API` object exists on the target window.
 * 3. Merge the browse API helpers into `rootApi.browse` using the shared singleton.
 * 4. Return the mounted browse API reference for chaining.
 *
 * @param {Window & { __TEST_API?: Record<string, any> }} [target=window]
 * @returns {typeof browseTestApi|null}
 */
export function registerBrowseTestApi(target = typeof window !== "undefined" ? window : undefined) {
  if (!target) return null;
  const rootApi =
    typeof target.__TEST_API === "object" && target.__TEST_API !== null
      ? target.__TEST_API
      : (target.__TEST_API = {});
  rootApi.browse = Object.assign(rootApi.browse || {}, browseTestApi);
  return rootApi.browse;
}

/**
 * Update carousel references so the browse test API operates on the latest render.
 *
 * @pseudocode
 * 1. Cache the latest carousel container and gokyo metadata.
 * 2. Rebuild the gokyo lookup for card rendering.
 * 3. Reset tracked nodes to avoid leaking DOM references across renders.
 * 4. Re-register the browse test API on the window.
 * 5. Resolve any pending readiness resolvers when the container exists.
 *
 * @param {object} options
 * @param {HTMLElement|null} options.container - Carousel container element.
 * @param {import("../types.js").GokyoEntry[]|undefined} options.gokyoData - Raw gokyo list.
 * @returns {void}
 */
export function updateBrowseTestApiContext({ container, gokyoData }) {
  state.container = container || null;
  state.gokyoData = Array.isArray(gokyoData) ? gokyoData : [];
  state.gokyoLookup = state.gokyoData.length ? createGokyoLookup(state.gokyoData) : {};
  state.addedNodes.clear();
  registerBrowseTestApi();
  if (state.container) {
    resolveReadyResolvers();
  } else {
    state.isCarouselReady = false;
  }
}

/**
 * Reset browse-specific test helpers and remove any injected state.
 *
 * @pseudocode
 * 1. Delegate to `resetState` to restore animations and remove injected cards.
 * 2. Re-register the browse API so subsequent tests can reuse the helpers.
 *
 * @returns {void}
 */
export function resetBrowseTestApi() {
  resetState();
  registerBrowseTestApi();
}

registerBrowseTestApi();

export { browseTestApi };
