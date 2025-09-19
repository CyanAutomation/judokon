console.log("[TEST DEBUG] evaluating testHooks.js");
import { emitBattleEvent, __resetBattleEventTarget } from "./battleEvents.js";
import { stopTimer } from "../battleEngineFacade.js";

// Internal flags to make bindings idempotent and allow limited rebinds in tests.
let __uiBound = false;
let __promisesBound = false;

const readStatFromCard = (card, stat, getCardStatValue) => {
  if (!card || typeof getCardStatValue !== "function") return NaN;

  const dataHost =
    typeof card.hasAttribute === "function" && card.hasAttribute("data-card-json")
      ? card
      : card.querySelector?.("[data-card-json]");

  const rawJson = dataHost?.getAttribute?.("data-card-json");
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      const value = Number(parsed?.stats?.[stat]);
      if (Number.isFinite(value)) return value;
    } catch {}
  }

  const domVal = getCardStatValue(card, stat);
  return Number.isFinite(domVal) ? domVal : NaN;
};

const deriveSelectionValues = (stat, getCardStatValue, getOpponentJudoka) => {
  const values = {};
  const playerCard = document.getElementById("player-card");
  const opponentCard = document.getElementById("opponent-card");

  const playerVal = readStatFromCard(playerCard, stat, getCardStatValue);
  if (Number.isFinite(playerVal)) {
    values.playerVal = playerVal;
  }

  let opponentVal = readStatFromCard(opponentCard, stat, getCardStatValue);
  if (!Number.isFinite(opponentVal) && typeof getOpponentJudoka === "function") {
    try {
      const opp = getOpponentJudoka();
      const cached = Number(opp?.stats?.[stat]);
      if (Number.isFinite(cached)) opponentVal = cached;
    } catch {}
  }
  if (Number.isFinite(opponentVal)) {
    values.opponentVal = opponentVal;
  }

  return values;
};

/**
 * Ensure Classic Battle UI listeners and test promises are registered.
 *
 * Binds the round UI event handlers and creates module-level awaitable
 * Promises used by tests. When `force` is true the function will attempt to
 * rebind dynamic handlers so test-time mocks are honored.
 *
 * @pseudocode
 * 1. If UI bindings are not present, import `./roundUI.js` to register static handlers.
 * 2. When `force` is set, reset the internal EventTarget and call the
 *    dynamic binding entrypoints so vi.mocks are respected.
 * 3. Ensure promises from `./promises.js` are created and reset when forced.
 *
 * @param {{force?: boolean}} [opts] - Optional flags. `force` rebinds dynamic handlers.
 * @returns {Promise<void>} Resolves when bindings and promises are available.
 */
export async function ensureBindings(opts = {}) {
  const force = !!opts.force;
  // Bind round UI listeners once per worker to avoid duplicate handlers.
  if (!__uiBound) {
    await import("/src/helpers/classicBattle/roundUI.js");
    __uiBound = true;
  } else if (force) {
    // Reset the event bus and bind dynamic handlers to honor vi.mocks.
    try {
      __resetBattleEventTarget();
    } catch {}
    const ui = await import("/src/helpers/classicBattle/roundUI.js");
    if (typeof ui.bindRoundUIEventHandlersDynamic === "function")
      ui.bindRoundUIEventHandlersDynamic();
    const eventHandlers = await import("/src/helpers/classicBattle/uiEventHandlers.js");
    if (typeof eventHandlers.bindUIHelperEventHandlersDynamic === "function")
      eventHandlers.bindUIHelperEventHandlersDynamic();
  }
  // Ensure event promises exist; allow a forced refresh after mocks in tests.
  if (!__promisesBound || force) {
    const prom = await import("/src/helpers/classicBattle/promises.js");
    if (typeof prom.resetBattlePromises === "function") prom.resetBattlePromises();
    __promisesBound = true;
  }
}

/**
 * Reset dynamic binding flags used during tests.
 *
 * Calling this releases the module-level marker that indicates promises and
 * dynamic handlers have been created so subsequent calls to
 * `ensureBindings({force:true})` will rebind handlers and recreate test
 * promises. This is intended for test harnesses that need to rewire
 * handlers between test cases.
 *
 * @pseudocode
 * 1. Clear the module-level `__promisesBound` flag so `ensureBindings` will
 *    re-import promise providers on next call.
 * 2. Clear any other module-level rebind markers (if present) to allow a
 *    fresh test harness setup.
 * 3. (No-op outside tests.)
 *
 * @returns {void}
 */
export function resetBindings() {
  __promisesBound = false;
}

/**
 * Trigger the round timeout flow immediately for tests.
 *
 * This helper mirrors the expiry behavior in `startTimer()` but runs
 * synchronously so tests don't need to advance real or fake timers.
 *
 * @pseudocode
 * 1. Import helpers that compute stat values and perform selection.
 * 2. Stop any running engine timer to avoid overlapping expirations.
 * 3. Emit `roundTimeout` to inform listeners and start auto-selection.
 * 4. Dispatch the `timeout` state transition and await the auto-select task.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle store instance.
 * @returns {Promise<void>} Resolves after the timeout flow completes.
 */
export async function triggerRoundTimeoutNow(store) {
  const { getOpponentJudoka } = await import("/src/helpers/classicBattle/cardSelection.js");
  const { getCardStatValue } = await import("/src/helpers/classicBattle/cardStatUtils.js");
  const { handleStatSelection } = await import("/src/helpers/classicBattle/selectionHandler.js");
  const { dispatchBattleEvent } = await import("/src/helpers/classicBattle/eventDispatcher.js");
  const { autoSelectStat } = await import("/src/helpers/classicBattle/autoSelectStat.js");

  const onExpiredSelect = async (stat, opts) => {
    const selectionValues = deriveSelectionValues(stat, getCardStatValue, getOpponentJudoka);
    return handleStatSelection(store, stat, {
      ...selectionValues,
      forceDirectResolution: true,
      ...opts
    });
  };
  stopTimer();
  try {
    emitBattleEvent("roundTimeout");
  } catch {}
  // Mirror timerService ordering: kick off auto-select immediately to
  // ensure `store.playerChoice` is set while the machine processes the
  // timeout transition into roundDecision.
  const selecting = (async () => {
    try {
      await autoSelectStat(onExpiredSelect, 0);
    } catch {}
  })();
  await dispatchBattleEvent("timeout");
  await selecting;
}

/**
 * Trigger the stalled-selection prompt immediately and schedule auto-select.
 *
 * Used by tests to surface the stall UI and cause an immediate auto-selection
 * without waiting for timeouts. This mirrors `handleStatSelectionTimeout`'s
 * behavior but runs synchronously.
 *
 * @pseudocode
 * 1. Import helpers for computing stat values and performing selection.
 * 2. Call `handleStatSelectionTimeout(store, onSelect, 0)` to schedule immediate action.
 * 3. Show a stall message and emit `statSelectionStalled` so tests can observe it.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle store instance.
 * @returns {Promise<void>} Resolves after stall prompt setup completes.
 */
export async function triggerStallPromptNow(store) {
  const { getOpponentJudoka } = await import("/src/helpers/classicBattle/cardSelection.js");
  const { getCardStatValue } = await import("/src/helpers/classicBattle/cardStatUtils.js");
  const { handleStatSelection } = await import("/src/helpers/classicBattle/selectionHandler.js");
  const { handleStatSelectionTimeout } = await import(
    "/src/helpers/classicBattle/autoSelectHandlers.js"
  );

  const onSelect = (stat, opts) => {
    const selectionValues = deriveSelectionValues(stat, getCardStatValue, getOpponentJudoka);
    return handleStatSelection(store, stat, { ...selectionValues, ...opts });
  };
  handleStatSelectionTimeout(store, onSelect, 0);
  // Surface the stall prompt immediately in tests to avoid waiting on timers.
  const stallMessage = "Stat selection stalled. Pick a stat or wait for auto-pick.";
  try {
    const scoreboard = await import("../setupScoreboard.js");
    scoreboard.showMessage(stallMessage);
  } catch {
    // Fallback: set message directly in DOM when scoreboard isn't initialized
    const messageEl = document.getElementById("round-message");
    if (messageEl) {
      messageEl.textContent = stallMessage;
    }
  }
  try {
    const { emitBattleEvent } = await import("/src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("statSelectionStalled");
  } catch {}
}
