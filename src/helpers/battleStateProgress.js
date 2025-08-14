/**
 * Render Classic Battle state progress list and sync active state.
 *
 * @pseudocode
 * 1. Fetch `classicBattleStates.json` using `fetchJson`.
 * 2. Filter for core states (IDs below 90).
 * 3. Render each state as an `<li>` with `data-state` and its numeric ID as text inside `#battle-state-progress`.
 * 4. Define `updateActive(state)` to toggle the `active` class on matching items.
 * 5. Observe `#machine-state` for text changes; on each change call `updateActive`.
 * 6. If `#machine-state` is missing, poll `window.__classicBattleState` via `requestAnimationFrame`.
 *
 * @returns {Promise<void>} Resolves when the list is initialized.
 */
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

export async function initBattleStateProgress() {
  const list = document.getElementById("battle-state-progress");
  if (!list) return;

  let states = [];
  try {
    states = await fetchJson(`${DATA_DIR}classicBattleStates.json`);
  } catch {
    // ignore fetch errors; list remains empty
  }

  const core = Array.isArray(states) ? states.filter((s) => s.id < 90) : [];
  const frag = document.createDocumentFragment();
  core.forEach((s) => {
    const li = document.createElement("li");
    li.dataset.state = s.name;
    li.textContent = String(s.id);
    frag.appendChild(li);
  });
  list.appendChild(frag);

  const items = Array.from(list.querySelectorAll("li"));
  const updateActive = (state) => {
    items.forEach((li) => {
      li.classList.toggle("active", li.dataset.state === state);
    });
  };

  const machine = document.getElementById("machine-state");
  if (machine && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      updateActive(machine.textContent.trim());
    });
    observer.observe(machine, { childList: true, characterData: true, subtree: true });
    updateActive(machine.textContent.trim());
    return;
  }

  let prev;
  const tick = () => {
    const state = window.__classicBattleState;
    if (state !== prev) {
      prev = state;
      updateActive(state);
    }
    requestAnimationFrame(tick);
  };
  tick();
}
