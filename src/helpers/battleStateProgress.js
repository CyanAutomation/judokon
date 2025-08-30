/**
 * Render Classic Battle state progress list and sync active state.
 *
 * @pseudocode
 * 1. Load `CLASSIC_BATTLE_STATES` from the embedded module.
 * 2. Filter for core states (IDs below 90).
 * 3. Sort core states by `id` in ascending order.
 * 4. If `#battle-state-progress` already matches state IDs and names, skip rendering.
 * 5. Otherwise, clear the list and render each state as an `<li>` with `data-state` and its numeric ID.
 * 6. Resolve `battleStateProgressReadyPromise` after rendering.
 * 7. Define `updateActive(state)` to query list items and toggle the `active` class on the match.
 * 8. Listen for `battle:state` events on `document` and call `updateActive` with the event detail.
 * 9. Apply the initial state from `document.body.dataset.battleState`.
 * 10. After the initial state is applied, call `markBattlePartReady('state')`.
 * 11. Return a cleanup function that removes the event listener.
 *
 * @returns {Promise<(() => void) | undefined>} Resolves with a cleanup function.
 */
import { CLASSIC_BATTLE_STATES } from "./classicBattle/stateTable.js";
import { updateBattleStateBadge } from "./classicBattle/uiHelpers.js";
import { markBattlePartReady } from "./battleInit.js";
import { isEnabled } from "./featureFlags.js";

/**
 * Internal resolver for `battleStateProgressReadyPromise`.
 * Assigned when running in a browser environment so callers can be
 * notified after the list is rendered (or skipped).
 *
 * @type {((value?: any) => void) | undefined}
 */
let resolveBattleStateProgressReady;

/**
 * Promise that resolves when the battle state progress list has been
 * rendered (or when rendering is intentionally skipped).
 *
 * - In browser environments this promise resolves when rendering completes
 *   or when the list is absent.
 * - In non-browser environments the promise resolves immediately.
 *
 * @type {Promise<(() => void) | undefined>}
 */
export const battleStateProgressReadyPromise =
  typeof window !== "undefined"
    ? new Promise((resolve) => {
        resolveBattleStateProgressReady = resolve;
      })
    : Promise.resolve();

if (typeof window !== "undefined") {
  window.battleStateProgressReadyPromise = battleStateProgressReadyPromise;
}

if (!isEnabled("battleStateProgress")) {
  resolveBattleStateProgressReady?.();
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
export async function initBattleStateProgress() {
  if (!isEnabled("battleStateProgress") || typeof document === "undefined") {
    document.getElementById("battle-state-progress")?.style.setProperty("display", "none");
    resolveBattleStateProgressReady?.();
    return;
  }

  const list = document.getElementById("battle-state-progress");
  if (!list) {
    resolveBattleStateProgressReady?.();
    return;
  }
  list.style.display = "";

  const states = Array.isArray(CLASSIC_BATTLE_STATES) ? CLASSIC_BATTLE_STATES : [];

  const core = Array.isArray(states)
    ? states.filter((s) => s.id < 90).sort((a, b) => a.id - b.id)
    : [];

  if (core.length === 0) {
    list.innerHTML = "<li>No states found</li>";
    resolveBattleStateProgressReady?.();
    return;
  }

  const items = Array.from(list.querySelectorAll("li"));
  const needsRender =
    items.length !== core.length ||
    items.some(
      (li, i) => li.dataset.state !== core[i].name || Number(li.textContent.trim()) !== core[i].id
    );

  if (needsRender) {
    list.textContent = "";
    const frag = document.createDocumentFragment();
    core.forEach((s) => {
      const li = document.createElement("li");
      li.dataset.state = s.name;
      li.textContent = String(s.id);
      frag.appendChild(li);
    });
    list.appendChild(frag);
  }

  resolveBattleStateProgressReady?.();

  const updateActive = (state) => {
    let target = state;
    // Map non-core states to nearest visible core state so the list
    // continues to reflect progress during interrupts or admin paths.
    if (!list.querySelector(`li[data-state="${target}"]`)) {
      if (target === "interruptRound") target = "cooldown";
      else if (target === "interruptMatch") target = "matchOver";
      else if (target === "roundModification") target = "roundDecision";
    }
    list.querySelectorAll("li").forEach((li) => {
      li.classList.toggle("active", li.dataset.state === target);
    });
    updateBattleStateBadge(state);
  };

  let ready = false;
  const handler = (e) => {
    // Accept both legacy string detail and new object shape { from, to }
    const detail = e && e.detail;
    const state =
      typeof detail === "string"
        ? detail
        : detail && typeof detail.to === "string"
          ? detail.to
          : document.body?.dataset?.battleState || "";
    if (!state) return;
    updateActive(state);
    if (!ready) {
      ready = true;
      markBattlePartReady("state");
    }
  };
  document.addEventListener("battle:state", handler);
  const initial = document.body?.dataset.battleState;
  if (initial) {
    updateActive(initial);
    ready = true;
    markBattlePartReady("state");
  }
  return () => document.removeEventListener("battle:state", handler);
}

/**
 * Initialize and render the battle state progress list and wire up
 * runtime updates.
 *
 * Responsibilities:
 * - Render a trimmed list of core states (id < 90) into the
 *   `#battle-state-progress` element when necessary.
 * - Provide visual active-state updates when `battle:state` events fire.
 * - Update the small status badge via `updateBattleStateBadge`.
 * - Resolve `battleStateProgressReadyPromise` once rendering or skip is done.
 * - Call `markBattlePartReady('state')` after the first active state is applied.
 *
 * Contract:
 * - Inputs: none (reads DOM and imported `CLASSIC_BATTLE_STATES`).
 * - Output: returns a cleanup function which removes the internal event listener,
 *   or `undefined` if the function returned early (no DOM available).
 * - Errors: DOM access issues are not thrown; function will simply return early
 *   and resolve the ready promise if appropriate.
 *
 * Edge cases handled:
 * - Missing `#battle-state-progress` element (resolves promise and exits).
 * - Empty or non-array `CLASSIC_BATTLE_STATES` (renders a fallback message).
 * - Idempotent rendering: skips DOM updates when existing list matches expected.
 *
 * @returns {Promise<(() => void) | undefined>} Resolves with a cleanup function
 *   that removes the `battle:state` listener, or `undefined` if not applicable.
 */
