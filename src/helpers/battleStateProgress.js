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
 * Data attribute names and state remappings.
 *
 * @type {{
 *   list: string;
 *   item: string;
 *   ready: string;
 *   initialized: string;
 *   count: string;
 *   active: string;
 *   activeOriginal: string;
 *   stateRemap: Record<string, string>;
 * }}
 */
const CONFIG = {
  list: "data-feature-battle-state-progress",
  item: "data-feature-battle-state-progress-item",
  ready: "data-feature-battle-state-ready",
  initialized: "data-progress-initialized",
  count: "data-progress-count",
  active: "data-feature-battle-state-active",
  activeOriginal: "data-feature-battle-state-active-original",
  stateRemap: {
    interruptRound: "cooldown",
    interruptMatch: "matchOver",
    roundModification: "roundDecision"
  }
};

/**
 * Internal resolver for `battleStateProgressReadyPromise`.
 * Assigned when running in a browser environment so callers can be
 * notified after the list is rendered (or skipped).
 *
 * @type {((value?: any) => void) | undefined}
 */
let resolveBattleStateProgressReady;

/**
 * Promise resolving when the battle state progress list has been rendered or skipped.
 *
 * - In browser environments: resolves when rendering completes or list is absent
 * - In non-browser environments: resolves immediately
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
  if (typeof document !== "undefined") {
    const list = document.getElementById("battle-state-progress");
    if (list) {
      list.classList.remove("ready");
      list.textContent = "";
      list.dataset.featureBattleStateReady = "false";
      list.removeAttribute(CONFIG.active);
      list.removeAttribute(CONFIG.activeOriginal);
    }
  }
  resolveBattleStateProgressReady?.();
}

/**
 * Render the core battle states into `#battle-state-progress` when necessary.
 *
 * @param {{ id: number, name: string }[]} coreStates
 * @returns {HTMLUListElement | undefined} The list element if it exists, undefined otherwise.
 * @throws {Error} If coreStates contains invalid entries without id or name.
 * @pseudocode
 * 1. Query `#battle-state-progress`; return undefined if missing.
 * 2. Show the list and handle empty `coreStates` with a fallback item.
 * 3. Compare existing items to `coreStates`; render new `<li>` elements when mismatched.
 * 4. Return the list element for further processing.
 */
export function renderStateList(coreStates) {
  const list = document.getElementById("battle-state-progress");
  if (!list) return undefined;
  list.style.display = "";
  list.setAttribute(CONFIG.list, "list");
  list.dataset.featureBattleStateReady = "pending";
  if (!coreStates.length) {
    list.innerHTML = "<li>No states found</li>";
    const placeholder = list.querySelector("li");
    if (placeholder) {
      placeholder.setAttribute(CONFIG.item, "true");
    }
    list.dataset.featureBattleStateReady = "true";
    list.dataset.featureBattleStateCount = "0";
    list.classList.add("ready");
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
      li.setAttribute(CONFIG.item, "true");
      frag.appendChild(li);
    }
    list.appendChild(frag);
  } else {
    for (const li of items) {
      li.setAttribute(CONFIG.item, "true");
    }
  }
  list.dataset.featureBattleStateReady = "true";
  list.dataset.featureBattleStateCount = String(coreStates.length);
  list.classList.add("ready");
  return list;
}

/**
 * Toggle the active state in the progress list, remapping interrupts to core states.
 *
 * If the target state doesn't exist in the list, attempts to remap non-core states
 * (interrupt and modification states) to their core state counterparts.
 *
 * @param {HTMLUListElement} list The progress list element.
 * @param {string} state The new active state.
 * @pseudocode
 * 1. Set the target state to the input state.
 * 2. If the target state is not in the list, remap using CONFIG.stateRemap.
 * 3. Iterate through all list items, toggling 'active' class based on match.
 * 4. Update ARIA and data attributes for accessibility.
 * 5. Update the battle state badge with the original (unmapped) state.
 * @returns {void}
 */
export function updateActiveState(list, state) {
  let target = state;
  if (!list.querySelector(`li[data-state="${target}"]`)) {
    target = CONFIG.stateRemap[target] || target;
  }
  for (const li of list.querySelectorAll("li")) {
    const isActive = li.dataset.state === target;
    li.classList.toggle("active", isActive);
    if (isActive) {
      li.setAttribute("aria-current", "step");
      li.setAttribute(CONFIG.active, "true");
    } else {
      li.removeAttribute("aria-current");
      li.removeAttribute(CONFIG.active);
    }
  }
  list.setAttribute(CONFIG.active, target);
  list.setAttribute(CONFIG.activeOriginal, state);
  updateBattleStateBadge(state);
}

/**
 * Listen for `battleStateChange` events and update the list.
 *
 * @param {HTMLUListElement} list The progress list element.
 * @param {boolean} [initialApplied=false] Whether initial state has been applied.
 * @returns {() => void} Cleanup function removing the listener.
 * @pseudocode
 * 1. Track readiness based on whether an initial state was applied.
 * 2. On each `battleStateChange`, extract the state from event detail or body dataset.
 * 3. Call `updateActiveState` with the extracted state.
 * 4. After the first update, mark the battle state part ready.
 * 5. Return a closure that unregisters the event listener.
 */
export function initProgressListener(list, initialApplied = false) {
  let ready = initialApplied;
  const handler = (e) => {
    const detail = e?.detail;
    let state =
      (typeof detail === "string" ? detail : detail?.to) ||
      "";
    
    // If we didn't get a state from the event detail, fall back to reading from DOM
    if (!state) {
      state = document.body?.dataset?.battleState || "";
    }
    
    // If still no state, try to get the current list's recorded state as a last resort
    if (!state) {
      state = list.getAttribute(CONFIG.activeOriginal) || "";
    }
    
    if (!state) return;
    updateActiveState(list, state);
    if (!ready) {
      ready = true;
      markBattlePartReady("state");
      list.dataset.featureBattleStateReady = "true";
    }
  };
  onBattleEvent("battleStateChange", handler);
  return () => offBattleEvent("battleStateChange", handler);
}
/**
 * Initialize and render the battle state progress list and wire up runtime updates.
 *
 * Responsibilities:
 * - Render a trimmed list of core states (id < 90) into the `#battle-state-progress` element
 * - Provide visual active-state updates when `battleStateChange` events fire
 * - Update the small status badge via `updateBattleStateBadge`
 * - Resolve `battleStateProgressReadyPromise` once rendering or skip is done
 * - Call `markBattlePartReady('state')` after the first active state is applied
 *
 * @async
 * @returns {Promise<(() => void) | undefined>} Cleanup function or undefined.
 * @throws {Error} If CLASSIC_BATTLE_STATES is invalid and cannot be processed safely.
 * @pseudocode
 * 1. If the feature flag is disabled, clear the element if the DOM exists and resolve.
 * 2. If `document` is unavailable, resolve the promise and return.
 * 3. Extract and filter core states (id < 90) from CLASSIC_BATTLE_STATES.
 * 4. Render the list via `renderStateList`.
 * 5. If an initial state exists on the body, apply it and mark ready.
 * 6. Register event listener and return cleanup function.
 */
export async function initBattleStateProgress() {
  if (!isEnabled("battleStateProgress")) {
    if (typeof document !== "undefined") {
      const list = document.getElementById("battle-state-progress");
      if (list) {
        list.classList.remove("ready");
        list.textContent = "";
        list.dataset.featureBattleStateReady = "false";
        list.removeAttribute(CONFIG.active);
        list.removeAttribute(CONFIG.activeOriginal);
      }
    }
    resolveBattleStateProgressReady?.();
    return;
  }

  if (typeof document === "undefined") {
    resolveBattleStateProgressReady?.();
    return;
  }

  const core = (Array.isArray(CLASSIC_BATTLE_STATES) ? CLASSIC_BATTLE_STATES : [])
    .filter((s) => s.id < 90)
    .sort((a, b) => a.id - b.id);

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
