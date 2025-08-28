/**
 * Utilities for battle-related browser tests.
 *
 * @pseudocode
 * _resetForTest
 *   1. Dynamically import classicBattle.js relative to the current page.
 *   2. Invoke its `_resetForTest` with the page's battle store.
 * setTieRound
 *   1. Set the next round timer to a short value.
 *   2. Populate player and opponent cards with equal Power stats to force a tie.
 */
export async function _resetForTest() {
  const mod = await import(new URL("/src/helpers/classicBattle.js", window.location.href));
  const store = window.__classicBattleDebugAPI
    ? window.__classicBattleDebugAPI.battleStore
    : window.battleStore;
  mod._resetForTest(store);
}

/**
 * Prepare a tie scenario with a 3 second timer.
 *
 * @pseudocode
 * 1. Update timer text to "Time Left: 3s".
 * 2. Give both players Power 3 to ensure a tie.
 */
export function setTieRound() {
  document.getElementById("next-round-timer").textContent = "Time Left: 3s";
  document.getElementById("player-card").innerHTML =
    `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
  document.getElementById("opponent-card").innerHTML =
    `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
}
