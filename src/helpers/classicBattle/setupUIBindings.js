import { setupScoreboard } from "../setupScoreboard.js";
import { initQuitButton } from "./quitButton.js";
import { initInterruptHandlers } from "./interruptHandlers.js";
import {
  watchBattleOrientation,
  setupNextButton,
  initStatButtons,
  applyStatLabels
} from "./uiHelpers.js";
import { onBattleEvent } from "./battleEvents.js";
import { initBattleStateProgress } from "../battleStateProgress.js";
import { isEnabled } from "../featureFlags.js";
import { initTooltips } from "../tooltip.js";
import { handleReplay } from "./roundManager.js";

let isReplayClickBound = false;
let replayStoreRef = null;

/**
 * Check whether an event target is a replay control.
 *
 * @pseudocode
 * 1. Return `false` when the target is not a DOM `Element`.
 * 2. Resolve the nearest replay control selector via `closest`.
 * 3. Return `true` when a replay control ancestor is present.
 *
 * @param {EventTarget | null | undefined} target
 * @returns {boolean}
 */
function isReplayControlTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest('#replay-button, #match-replay-button, [data-testid="replay-button"]')
  );
}

/**
 * Handle document-level replay click delegation.
 *
 * @pseudocode
 * 1. Exit when the event target is not a replay control.
 * 2. Exit when no active replay store reference is available.
 * 3. Forward replay handling to `handleReplay` with the active store.
 *
 * @param {MouseEvent} event
 * @returns {Promise<void>}
 */
async function onDocumentReplayClick(event) {
  if (!isReplayControlTarget(event?.target) || !replayStoreRef) {
    return;
  }

  await handleReplay(replayStoreRef);
}

/**
 * Bind delegated replay click handling once.
 *
 * @pseudocode
 * 1. Exit when the delegated listener is already registered.
 * 2. Persist the current store reference for delegated replay handling.
 * 3. Register a capture-phase document click listener once.
 * 4. Register one-time `pagehide` cleanup to release module references.
 *
 * @param {unknown} store
 */
function bindReplayClickListener(store) {
  if (isReplayClickBound) {
    return;
  }

  replayStoreRef = store;
  document.addEventListener("click", onDocumentReplayClick, { capture: true });
  window.addEventListener("pagehide", unbindReplayClickListener, { once: true });
  isReplayClickBound = true;
}

/**
 * Remove delegated replay handling and release module state.
 *
 * @pseudocode
 * 1. Exit when there is no bound replay click listener.
 * 2. Remove the capture-phase replay click listener.
 * 3. Reset listener/state flags so a new store can bind cleanly.
 *
 * @returns {void}
 */
export function unbindReplayClickListener() {
  if (!isReplayClickBound) {
    return;
  }

  document.removeEventListener("click", onDocumentReplayClick, { capture: true });
  replayStoreRef = null;
  isReplayClickBound = false;
}

/**
 * Wire up DOM bindings for the classic battle view.
 *
 * @pseudocode
 * 1. Setup scoreboard, quit button and interrupt handlers.
 * 2. Watch orientation and initialize stat buttons and next button.
 * 3. Bind stat button state to battle events.
 * 4. Initialize battle progress, labels, tooltips and hints.
 * 5. Return `statButtonControls` for later use.
 *
 * @param {import("./view.js").ClassicBattleView} view
 * @returns {Promise<ReturnType<typeof initStatButtons>>}
 */
export async function setupUIBindings(view) {
  const store = view.controller.battleStore;
  setupScoreboard(view.controller.timerControls);
  initQuitButton(store);
  initInterruptHandlers(store);
  bindReplayClickListener(store);
  watchBattleOrientation(() => view.applyBattleOrientation());

  setupNextButton();
  const statButtonControls = initStatButtons(store);

  onBattleEvent("statButtons:enable", () => {
    // Check if a selection is in progress; if so, don't re-enable buttons
    const container =
      typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
    const selectionInProgress = container?.dataset?.selectionInProgress;

    if (selectionInProgress === "true") {
      return;
    }

    statButtonControls?.enable();
    // Focus the first stat button for keyboard navigation
    const firstButton = document.querySelector("#stat-buttons button[data-stat]");
    if (firstButton) {
      firstButton.focus();
    }
  });
  onBattleEvent("statButtons:disable", () => statButtonControls?.disable());

  if (isEnabled("battleStateProgress")) {
    const cleanupBattleStateProgress = await initBattleStateProgress();
    if (cleanupBattleStateProgress) {
      window.addEventListener("pagehide", cleanupBattleStateProgress, { once: true });
    }
  }

  try {
    await applyStatLabels();
  } catch {}
  try {
    await initTooltips();
  } catch (error) {
    try {
      console.debug("initTooltips failed", error);
    } catch {}
  }

  return statButtonControls;
}

export default setupUIBindings;
