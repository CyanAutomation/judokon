/**
 * Render Classic Battle state progress list and sync active state.
 *
 * @pseudocode
 * 1. Fetch `classicBattleStates.json` using `fetchJson`.
 * 2. Filter for core states (IDs below 90).
 * 3. Sort core states by `id` in ascending order.
 * 4. Render each state as an `<li>` with `data-state` and its numeric ID inside `#battle-state-progress`.
 * 5. Define `updateActive(state)` to toggle the `active` class on matching items.
 * 6. Observe `#machine-state` for text changes; on each change call `updateActive`.
 * 7. If `#machine-state` is missing, poll `window.__classicBattleState` via `requestAnimationFrame` and store the ID.
 * 8. Return a cleanup function that disconnects the observer or cancels the animation frame loop.
 *
 * @returns {Promise<(() => void) | undefined>} Resolves with a cleanup function.
 */
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { setupScoreboard } from "./setupScoreboard.js";

if (typeof process === "undefined" || !process.env.VITEST) {
  setupScoreboard();
}

export async function initBattleStateProgress() {
  if (typeof document === "undefined") return;

  const list = document.getElementById("battle-state-progress");
  if (!list) return;

  let states = [];
  try {
    states = await fetchJson(`${DATA_DIR}classicBattleStates.json`);
  } catch {
    // ignore fetch errors; list remains empty
  }

  const core = Array.isArray(states)
    ? states.filter((s) => s.id < 90).sort((a, b) => a.id - b.id)
    : [];
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
    return () => observer.disconnect();
  }

  let prev;
  let id = 0;
  const tick = () => {
    const state = window.__classicBattleState;
    if (state !== prev) {
      prev = state;
      updateActive(state);
    }
    id = requestAnimationFrame(tick);
    return id;
  };
  id = tick();
  return () => cancelAnimationFrame(id);
}
