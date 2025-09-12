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
 * 8. Listen for `battleStateChange` events via `onBattleEvent` and call `updateActive` with the event detail.
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
import { onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";

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
/**
 * Promise resolving when the battle state progress list has been rendered or skipped.
 *
 * @summary Notifies callers when the state progress list has been initialized.
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
  const handler = () => {
    markBattlePartReady("state");
    offBattleEvent("battleStateChange", handler);
  };
  onBattleEvent("battleStateChange", handler);
  resolveBattleStateProgressReady?.();
}

/**
 * Render the core battle states into `#battle-state-progress` when necessary.
 *
 * @param {{ id: number, name: string }[]} coreStates
 * @returns {HTMLUListElement | undefined} The list element if it exists.
 * @pseudocode
 * 1. Query `#battle-state-progress`; return if missing.
 * 2. Show the list and handle empty `coreStates` with a fallback item.
 * 3. Compare existing items to `coreStates`; render new `<li>` elements when mismatched.
 * 4. Return the list element for further processing.
 */
export function renderStateList(coreStates) {
  const list = document.getElementById("battle-state-progress");
  if (!list) return undefined;
  list.style.display = "";
  if (!coreStates.length) {
    list.innerHTML = "<li>No states found</li>";
    return list;
  }
  const items = Array.from(list.querySelectorAll("li"));
  const needsRender =
    items.length !== coreStates.length ||
    items.some(
      (li, i) =>
        li.dataset.state !== coreStates[i].name ||
        Number(li.textContent.trim()) !== coreStates[i].id
    );
  if (needsRender) {
    list.textContent = "";
    const frag = document.createDocumentFragment();
    for (const s of coreStates) {
      const li = document.createElement("li");
      li.dataset.state = s.name;
      li.textContent = String(s.id);
      frag.appendChild(li);
    }
    list.appendChild(frag);
  }
  return list;
}

/**
 * Toggle the active state in the progress list, remapping interrupts.
 *
 * @param {HTMLUListElement} list The progress list element.
 * @param {string} state The new active state.
 * @pseudocode
 * 1. Set the target state to the input state.
 * 2. If the target state is not in the list, remap non-core states (e.g., `interruptRound` to `cooldown`).
 * 3. Iterate through all list items, toggling the 'active' class based on whether the item's `data-state` matches the target state.
 * 4. Update the separate battle state badge with the original, unmapped state.
 * @returns {void}
 */
export function updateActiveState(list, state) {
  let target = state;
  if (!list.querySelector(`li[data-state="${target}"]`)) {
    if (target === "interruptRound") target = "cooldown";
    else if (target === "interruptMatch") target = "matchOver";
    else if (target === "roundModification") target = "roundDecision";
  }
  for (const li of list.querySelectorAll("li")) {
    li.classList.toggle("active", li.dataset.state === target);
  }
  updateBattleStateBadge(state);
}

/**
 * Listen for `battleStateChange` events and update the list.
 *
 * @param {HTMLUListElement} list
 * @param {boolean} [initialApplied=false]
 * @returns {() => void} Cleanup function removing the listener.
 * @pseudocode
 * 1. Track readiness based on whether an initial state was applied.
 * 2. On each `battleStateChange`, extract the state and call `updateActiveState`.
 * 3. After the first update, mark the battle state part ready.
 * 4. Return a closure that unregisters the event listener.
 */
export function initProgressListener(list, initialApplied = false) {
  let ready = initialApplied;
  const handler = (e) => {
    const detail = e && e.detail;
    const state =
      typeof detail === "string"
        ? detail
        : detail && typeof detail.to === "string"
          ? detail.to
          : document.body?.dataset?.battleState || "";
    if (!state) return;
    updateActiveState(list, state);
    if (!ready) {
      ready = true;
      markBattlePartReady("state");
    }
  };
  onBattleEvent("battleStateChange", handler);
  return () => offBattleEvent("battleStateChange", handler);
}
/**
 * Initialize and render the battle state progress list and wire up runtime
 * updates.
 *
 * Responsibilities:
 * - Render a trimmed list of core states (id < 90) into the
 *   `#battle-state-progress` element when necessary.
 * - Provide visual active-state updates when `battleStateChange` events fire.
 * - Update the small status badge via `updateBattleStateBadge`.
 * - Resolve `battleStateProgressReadyPromise` once rendering or skip is done.
 * - Call `markBattlePartReady('state')` after the first active state is applied.
 *
 * @pseudocode
 * 1. If the feature flag is disabled, hide the element if the DOM exists, ensure `'state'` is
 *    marked ready, resolve the ready promise, and return.
 * 2. If `document` is unavailable resolve the ready promise and return.
 * 3. Locate `#battle-state-progress` and either render or skip depending on `CLASSIC_BATTLE_STATES`.
 * 4. Resolve the ready promise and register an event listener to toggle `active` on list items.
 * 5. If an initial state exists on the body, apply it and mark the state part ready.
 * 6. Return a cleanup function that removes the event listener.
 *
 * @returns {Promise<(() => void) | undefined>} Resolves with a cleanup function
 *   or undefined.
 */
export async function initBattleStateProgress() {
  if (!isEnabled("battleStateProgress")) {
    if (typeof document !== "undefined") {
      document.getElementById("battle-state-progress")?.style.setProperty("display", "none");
    }
    resolveBattleStateProgressReady?.();
    return;
  }

  if (typeof document === "undefined") {
    resolveBattleStateProgressReady?.();
    return;
  }

  const states = Array.isArray(CLASSIC_BATTLE_STATES) ? CLASSIC_BATTLE_STATES : [];
  const core = Array.isArray(states)
    ? states.filter((s) => s.id < 90).sort((a, b) => a.id - b.id)
    : [];

  const list = renderStateList(core);
  resolveBattleStateProgressReady?.();
  if (!list || core.length === 0) return;

  let initialApplied = false;
  const initial = document.body?.dataset.battleState;
  if (initial) {
    updateActiveState(list, initial);
    markBattlePartReady("state");
    initialApplied = true;
  }
  return initProgressListener(list, initialApplied);
}
