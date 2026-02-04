import { emitBattleEvent, __resetBattleEventTarget } from "./battleEvents.js";
import { stopTimer } from "../BattleEngine.js";
import * as roundUIModule from "./roundUI.js";
import * as uiServiceModule from "./uiService.js";
import * as uiEventHandlersModule from "./uiEventHandlers.js";
import * as roundFlowControllerModule from "./roundFlowController.js";
import * as promisesModule from "./promises.js";
import * as cardSelectionModule from "./cardSelection.js";
import * as cardStatUtilsModule from "./cardStatUtils.js";
import * as selectionHandlerModule from "./selectionHandler.js";
import * as eventDispatcherModule from "./eventDispatcher.js";
import * as autoSelectModule from "./autoSelectStat.js";
import * as autoSelectHandlersModule from "./autoSelectHandlers.js";
import { bindCountdownEventHandlersOnce } from "./timerService.js";
import { showMessage as scoreboardShowMessage } from "../../components/Scoreboard.js";
import { createStatsPanel as createStatsPanelDefault } from "../../components/StatsPanel.js";

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

const TEST_STAT_BASE = {
  power: 1,
  speed: 1,
  technique: 1,
  kumikata: 1,
  newaza: 1
};

const TEST_PLAYER_CARD_BASE = {
  id: 10000,
  firstname: "Test",
  surname: "Player",
  country: "Testland",
  countryCode: "tt",
  weightClass: "Open",
  signatureMoveId: 0,
  rarity: "common",
  stats: TEST_STAT_BASE
};

const TEST_OPPONENT_CARD_BASE = {
  id: 10001,
  firstname: "Test",
  surname: "Opponent",
  country: "Testland",
  countryCode: "tt",
  weightClass: "Open",
  signatureMoveId: 0,
  rarity: "common",
  stats: TEST_STAT_BASE
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

const mergeTestCardData = (base, overrides = {}) => {
  const { stats: statOverrides, ...cardOverrides } = overrides || {};
  const mergedStats = {
    ...base.stats,
    ...(statOverrides && typeof statOverrides === "object" ? statOverrides : {})
  };

  return {
    ...base,
    ...cardOverrides,
    stats: mergedStats
  };
};

const renderStatsCardForTest = async (target, base, overrides) => {
  if (!target) return null;
  const createStatsPanel =
    typeof createStatsPanelDefault === "function" ? createStatsPanelDefault : null;
  if (!createStatsPanel) return null;

  const cardData = mergeTestCardData(base, overrides);
  const rarityClass = String(cardData.rarity || "common").toLowerCase();
  const statsPanel = await createStatsPanel(cardData.stats, { type: rarityClass });

  const container = document.createElement("div");
  container.className = "card-container";
  try {
    container.dataset.cardJson = JSON.stringify(cardData);
  } catch (error) {
    console.warn("Failed to serialize test card data", error);
    container.dataset.cardJson = JSON.stringify({ id: cardData.id, stats: cardData.stats });
  }

  const card = document.createElement("div");
  card.className = `judoka-card ${rarityClass}`.trim();
  card.appendChild(statsPanel);

  container.appendChild(card);
  target.replaceChildren(container);

  return cardData;
};

/**
 * Render simplified Classic Battle cards with deterministic stat values for tests.
 *
 * @pseudocode
 * @param {object} [config] - Configuration object with player and opponent overrides.
 * @param {object} [config.player] - Player card overrides including stats.
 * @param {object} [config.opponent] - Opponent card overrides including stats.
 * @param {object} [config.player.stats] - Player stat overrides (power, speed, technique, etc.).
 * @param {object} [config.opponent.stats] - Opponent stat overrides (power, speed, technique, etc.).
 *   player?: { stats?: Partial<Record<string, number>> } & Record<string, unknown>,
 *   opponent?: { stats?: Partial<Record<string, number>> } & Record<string, unknown>
 * }} [config] - Stat overrides and optional card metadata for each side.
 * @returns {Promise<{playerCardData: object|null, opponentCardData: object|null}>}
 */
export async function setCardStatValuesForTest(config = {}) {
  const { player = {}, opponent = {} } = config || {};
  const playerTarget = document.getElementById("player-card");
  const opponentTarget = document.getElementById("opponent-card");

  const [playerCardData, opponentCardData] = await Promise.all([
    renderStatsCardForTest(playerTarget, TEST_PLAYER_CARD_BASE, player),
    renderStatsCardForTest(opponentTarget, TEST_OPPONENT_CARD_BASE, opponent)
  ]);

  return { playerCardData, opponentCardData };
}

/**
 * Ensure Classic Battle UI listeners and test promises are registered.
 *
 * Binds the round UI event handlers and creates module-level awaitable
 * Promises used by tests. When `force` is true the function will attempt to
 * rebind dynamic handlers so test-time mocks are honored.
 *
 * @pseudocode
 * 1. If UI bindings are not present, resolve round UI handlers via deps or static module.
 * 2. When `force` is set, reset the internal EventTarget and call the
 *    dynamic binding entrypoints so vi.mocks are respected.
 * 3. Ensure promises from `./promises.js` (or overrides) are created and reset when forced.
 *
 * @param {{
 *   force?: boolean,
 *   deps?: {
 *     roundUI?: typeof import('./roundUI.js'),
 *     uiService?: typeof import('./uiService.js'),
 *     uiEventHandlers?: typeof import('./uiEventHandlers.js'),
 *     roundFlowController?: typeof import('./roundFlowController.js'),
 *     promises?: typeof import('./promises.js')
 *   }
 * }} [opts] - Optional flags and dependency overrides. `force` rebinds dynamic handlers.
 * @returns {Promise<void>} Resolves when bindings and promises are available.
 */
export async function ensureBindings(opts = {}) {
  const { force = false, deps: dependencyOverrides = {} } = opts || {};
  const roundUI = dependencyOverrides.roundUI ?? roundUIModule;
  const uiService = dependencyOverrides.uiService ?? uiServiceModule;
  const uiEventHandlers = dependencyOverrides.uiEventHandlers ?? uiEventHandlersModule;
  const roundFlowController = dependencyOverrides.roundFlowController ?? roundFlowControllerModule;
  const promises = dependencyOverrides.promises ?? promisesModule;

  // Bind round UI listeners once per worker to avoid duplicate handlers.
  if (!__uiBound) {
    if (typeof roundFlowController.bindRoundFlowControllerOnce === "function") {
      roundFlowController.bindRoundFlowControllerOnce();
    }
    if (typeof roundUI.bindRoundUIEventHandlersDynamic === "function") {
      roundUI.bindRoundUIEventHandlersDynamic();
    }
    if (typeof uiService.bindUIServiceEventHandlersOnce === "function") {
      uiService.bindUIServiceEventHandlersOnce();
    }
    if (typeof bindCountdownEventHandlersOnce === "function") {
      bindCountdownEventHandlersOnce();
    }
    __uiBound = true;
    if (force) {
      try {
        __resetBattleEventTarget();
      } catch {}
      if (typeof roundFlowController.bindRoundFlowControllerOnce === "function") {
        roundFlowController.bindRoundFlowControllerOnce();
      }
      if (typeof roundUI.bindRoundUIEventHandlersDynamic === "function") {
        roundUI.bindRoundUIEventHandlersDynamic();
      }
      if (typeof uiService.bindUIServiceEventHandlersOnce === "function") {
        uiService.bindUIServiceEventHandlersOnce();
      }
      if (typeof bindCountdownEventHandlersOnce === "function") {
        bindCountdownEventHandlersOnce();
      }
      if (typeof uiEventHandlers.bindUIHelperEventHandlersDynamic === "function") {
        uiEventHandlers.bindUIHelperEventHandlersDynamic();
      }
    }
  } else if (force) {
    // Reset the event bus and bind dynamic handlers to honor vi.mocks.
    try {
      __resetBattleEventTarget();
    } catch {}
    if (typeof roundFlowController.bindRoundFlowControllerOnce === "function") {
      roundFlowController.bindRoundFlowControllerOnce();
    }
    if (typeof roundUI.bindRoundUIEventHandlersDynamic === "function") {
      roundUI.bindRoundUIEventHandlersDynamic();
    }
    if (typeof uiService.bindUIServiceEventHandlersOnce === "function") {
      uiService.bindUIServiceEventHandlersOnce();
    }
    if (typeof bindCountdownEventHandlersOnce === "function") {
      bindCountdownEventHandlersOnce();
    }
    if (typeof uiEventHandlers.bindUIHelperEventHandlersDynamic === "function") {
      uiEventHandlers.bindUIHelperEventHandlersDynamic();
    }
  }

  // Ensure event promises exist; allow a forced refresh after mocks in tests.
  if (!__promisesBound || force) {
    if (typeof promises.resetBattlePromises === "function") {
      promises.resetBattlePromises();
    }
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
 * 1. Resolve helpers that compute stat values and perform selection.
 * 2. Stop any running engine timer to avoid overlapping expirations.
 * 3. Emit `roundTimeout` to inform listeners and start auto-selection.
 * 4. Dispatch the `timeout` state transition to enter `roundResolve`.
 * 5. Give the browser a chance to render between state transitions via setTimeout(0).
 * 6. Run auto-select and (optionally) await completion.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle store instance.
 * @param {{
 *   awaitCompletion?: boolean,
 *   deps?: {
 *     getOpponentJudoka?: typeof import('./cardSelection.js')['getOpponentJudoka'],
 *     getCardStatValue?: typeof import('./cardStatUtils.js')['getCardStatValue'],
 *     handleStatSelection?: typeof import('./selectionHandler.js')['handleStatSelection'],
 *     dispatchBattleEvent?: typeof import('./eventDispatcher.js')['dispatchBattleEvent'],
 *     autoSelectStat?: typeof import('./autoSelectStat.js')['autoSelectStat']
 *   }
 * }} [options] - Optional behaviour overrides and dependency injection hooks.
 * @returns {Promise<void>} Resolves after the timeout flow completes or once the timeout transition settles when awaiting is disabled.
 */
export async function triggerRoundTimeoutNow(store, options = {}) {
  const { awaitCompletion = true, deps: dependencyOverrides = {} } = options || {};
  const getOpponentJudoka =
    dependencyOverrides.getOpponentJudoka ?? cardSelectionModule.getOpponentJudoka;
  const getCardStatValue =
    dependencyOverrides.getCardStatValue ?? cardStatUtilsModule.getCardStatValue;
  const handleStatSelection =
    dependencyOverrides.handleStatSelection ?? selectionHandlerModule.handleStatSelection;
  const dispatchBattleEvent =
    dependencyOverrides.dispatchBattleEvent ?? eventDispatcherModule.dispatchBattleEvent;
  const autoSelectStat = dependencyOverrides.autoSelectStat ?? autoSelectModule.autoSelectStat;

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

  // CRITICAL FIX: Perform auto-select BEFORE transitioning to roundResolve.
  // This ensures store.playerChoice is set before round resolution begins,
  // avoiding the race condition where the guard timeout fires before selection completes.
  try {
    const autoSelectPromise = autoSelectStat(onExpiredSelect, 0);
    if (awaitCompletion) {
      await autoSelectPromise;
    } else {
      try {
        if (autoSelectPromise && typeof autoSelectPromise.then === "function") {
          autoSelectPromise.catch(() => {});
        }
      } catch {
        // Ignore synchronous errors when not awaiting completion
      }
    }
  } catch {}

  // Now dispatch the timeout to transition state (roundSelect -> roundResolve).
  // At this point, store.playerChoice should already be set by autoSelectStat.
  await dispatchBattleEvent("timeout");
}

/**
 * Trigger the stalled-selection prompt immediately and schedule auto-select.
 *
 * Used by tests to surface the stall UI and cause an immediate auto-selection
 * without waiting for timeouts. This mirrors `handleStatSelectionTimeout`'s
 * behavior but runs synchronously.
 *
 * @pseudocode
 * 1. Resolve helpers for computing stat values and performing selection.
 * 2. Call `handleStatSelectionTimeout(store, onSelect, 0)` to schedule immediate action.
 * 3. Show a stall message and emit `statSelectionStalled` so tests can observe it.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle store instance.
 * @param {{
 *   deps?: {
 *     getOpponentJudoka?: typeof import('./cardSelection.js')['getOpponentJudoka'],
 *     getCardStatValue?: typeof import('./cardStatUtils.js')['getCardStatValue'],
 *     handleStatSelection?: typeof import('./selectionHandler.js')['handleStatSelection'],
 *     handleStatSelectionTimeout?: typeof import('./autoSelectHandlers.js')['handleStatSelectionTimeout'],
 *     showScoreboardMessage?: typeof import('../../components/Scoreboard.js')['showMessage'],
 *     emitBattleEvent?: typeof import('./battleEvents.js')['emitBattleEvent']
 *   }
 * }} [options] - Optional dependency overrides used in tests.
 * @returns {Promise<void>} Resolves after stall prompt setup completes.
 */
export async function triggerStallPromptNow(store, options = {}) {
  const { deps: dependencyOverrides = {} } = options || {};
  const getOpponentJudoka =
    dependencyOverrides.getOpponentJudoka ?? cardSelectionModule.getOpponentJudoka;
  const getCardStatValue =
    dependencyOverrides.getCardStatValue ?? cardStatUtilsModule.getCardStatValue;
  const handleStatSelection =
    dependencyOverrides.handleStatSelection ?? selectionHandlerModule.handleStatSelection;
  const handleStatSelectionTimeout =
    dependencyOverrides.handleStatSelectionTimeout ??
    autoSelectHandlersModule.handleStatSelectionTimeout;
  const showMessage = dependencyOverrides.showScoreboardMessage ?? scoreboardShowMessage;
  const emitBattleEventFn = dependencyOverrides.emitBattleEvent ?? emitBattleEvent;

  const onSelect = (stat, opts) => {
    const selectionValues = deriveSelectionValues(stat, getCardStatValue, getOpponentJudoka);
    return handleStatSelection(store, stat, { ...selectionValues, ...opts });
  };
  handleStatSelectionTimeout(store, onSelect, 0);
  // Surface the stall prompt immediately in tests to avoid waiting on timers.
  const stallMessage = "Stat selection stalled. Pick a stat or wait for auto-pick.";
  if (typeof showMessage === "function") {
    try {
      showMessage(stallMessage);
    } catch {
      const messageEl = document.getElementById("round-message");
      if (messageEl) {
        messageEl.textContent = stallMessage;
      }
    }
  } else {
    const messageEl = document.getElementById("round-message");
    if (messageEl) {
      messageEl.textContent = stallMessage;
    }
  }
  try {
    emitBattleEventFn?.("statSelectionStalled");
  } catch {}
}

/**
 * Lightweight synchronous initializer for test bindings.
 *
 * Sets up the minimal essential state needed by tests without async imports.
 * This includes the global event target and test promises, avoiding race
 * conditions with vi.resetModules() in the global test harness.
 *
 * @test-only This function is intended for test setup only.
 * @pseudocode
 * 1. Ensure the global event target exists by creating it if needed.
 * 2. Reset battle promises to create fresh test synchronization promises.
 * 3. (No async operations; this is synchronous.)
 *
 * @returns {void}
 */
export function initializeTestBindingsLight() {
  // Inline event target setup (from battleEvents.js)
  const EVENT_TARGET_KEY = "__classicBattleEventTarget";
  if (!globalThis[EVENT_TARGET_KEY]) {
    const t = new EventTarget();
    globalThis[EVENT_TARGET_KEY] = t;
    // Skip Node.js tuning for simplicity in tests
  }

  // Inline promise setup (from promises.js)
  function setupPromise(key, eventName) {
    let resolve;
    function reset() {
      const p = new Promise((r) => {
        resolve = r;
      });
      try {
        if (typeof window !== "undefined") {
          window[key] = p;
          window[`__resolved_${key}`] = p;
          try {
            window.__promiseEvents = window.__promiseEvents || [];
            window.__promiseEvents.push({ type: "promise-reset", key, ts: Date.now() });
          } catch {}
        }
      } catch {}
      return p;
    }
    let promise = reset();
    // Add event listener to the global target
    const target = globalThis[EVENT_TARGET_KEY];
    target.addEventListener(eventName, () => {
      try {
        try {
          window.__promiseEvents = window.__promiseEvents || [];
          window.__promiseEvents.push({ type: "promise-resolve", key, ts: Date.now() });
        } catch {}
        if (typeof window !== "undefined") window[`__resolved_${key}`] = true;
        resolve();
      } catch {}
      promise = reset();
    });
    return () => promise;
  }

  // Reset promises
  window.roundOptionsReadyPromise = setupPromise("roundOptionsReadyPromise", "roundOptionsReady")();
  window.roundPromptPromise = setupPromise("roundPromptPromise", "roundPrompt")();
  window.nextRoundTimerReadyPromise = setupPromise(
    "nextRoundTimerReadyPromise",
    "nextRoundTimerReady"
  )();
  window.matchOverPromise = setupPromise("matchOverPromise", "matchOver")();
  window.countdownStartedPromise = setupPromise(
    "countdownStartedPromise",
    "nextRoundCountdownStarted"
  )();
  window.roundTimeoutPromise = setupPromise("roundTimeoutPromise", "roundTimeout")();
  window.statSelectionStalledPromise = setupPromise(
    "statSelectionStalledPromise",
    "statSelectionStalled"
  )();
  window.roundResolvedPromise = setupPromise("roundResolvedPromise", "roundResolved")();
}
