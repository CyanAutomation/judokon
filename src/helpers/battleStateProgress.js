/**
 * Render Classic Battle state progress list and sync active state.
 *
 * @pseudocode
 * 1. Fetch `classicBattleStates.json` using `fetchJson`.
 * 2. Filter for core states (IDs below 90).
 * 3. Sort core states by `id` in ascending order.
 * 4. If `#battle-state-progress` already has the same number of items, skip rendering.
 * 5. Otherwise, clear the list and render each state as an `<li>` with `data-state` and its numeric ID.
 * 6. Define `updateActive(state)` to query list items and toggle the `active` class on the match.
 * 7. Observe `#machine-state` for text changes; on each change call `updateActive`.
 * 8. If `#machine-state` is missing, poll `window.__classicBattleState` via `requestAnimationFrame` and store the ID.
 * 9. Return a cleanup function that disconnects the observer or cancels the animation frame loop.
 *
 * @returns {Promise<(() => void) | undefined>} Resolves with a cleanup function.
 */
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { updateBattleStateBadge } from "./classicBattle/uiHelpers.js";

export async function initBattleStateProgress() {
  if (typeof document === "undefined") return;

  const list = document.getElementById("battle-state-progress");
  if (!list) return;

  let states = [];
  try {
    states = await fetchJson(`${DATA_DIR}classicBattleStates.json`);
  } catch (error) {
    console.warn("Failed to load battle state progress data:", error);
    list.innerHTML = "<li>Error loading states</li>";
    return;
  }

  const core = Array.isArray(states)
    ? states.filter((s) => s.id < 90).sort((a, b) => a.id - b.id)
    : [];

  if (core.length === 0) {
    list.innerHTML = "<li>No states found</li>";
    return;
  }

  if (list.children.length !== core.length) {
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

  const updateActive = (state) => {
    list.querySelectorAll("li").forEach((li) => {
      li.classList.toggle("active", li.dataset.state === state);
    });
    updateBattleStateBadge(state);
  };

  const machine = document.getElementById("machine-state");
  if (machine && typeof MutationObserver !== "undefined") {
    let prevState = null;
    const observer = new MutationObserver(() => {
      const state = machine.textContent.trim();
      if (state !== prevState) {
        prevState = state;
        updateActive(state);
      }
    });
    observer.observe(machine, { childList: true, characterData: true, subtree: true });
    const initialState = machine.textContent.trim();
    prevState = initialState;
    updateActive(initialState);
    return () => observer.disconnect();
  }

  let prev;
  let rafId = 0;
  const tick = () => {
    const state = window.__classicBattleState;
    if (state !== prev) {
      prev = state;
      updateActive(state);
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}
