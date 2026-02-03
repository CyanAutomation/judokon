import * as scoreboard from "../setupScoreboard.js";
import { updateDebugPanel } from "./debugPanel.js";
import { onBattleEvent, getBattleEventTarget, emitBattleEvent } from "./battleEvents.js";
import { roundState } from "./roundState.js";
let scoreboardBindingsReady = Promise.resolve();

/**
 * Extract the timer seconds from a battle event detail payload.
 *
 * @param {{ secondsRemaining?: number } | undefined} detail event payload detail
 * @returns {number | null} seconds remaining when valid, otherwise null
 */
function extractSeconds(detail) {
  const seconds = detail?.secondsRemaining;
  return typeof seconds === "number" && Number.isFinite(seconds) ? seconds : null;
}

/**
 * Normalize battle round numbers that may be provided as numbers or strings.
 *
 * @param {unknown} value potential round value from an event payload
 * @returns {number | null} finite round number when valid, otherwise null
 * @pseudocode
 *   if value is a finite number → return value
 *   else if value is a string whose trimmed form is not empty
 *     parsed ← Number(value) // Number() automatically trims surrounding whitespace
 *     if parsed is finite → return parsed
 *   return null for all other types or when parsing fails
 */
function parseRoundNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/**
 * Detect if the application is running in CLI mode.
 *
 * @returns {boolean} - True if CLI mode is active.
 */
function isCliMode() {
  return !!document.getElementById("cli-countdown");
}

function handleRoundStart(event) {
  try {
    scoreboard.clearMessage();
  } catch {}
  const detail = event?.detail || {};
  const roundNumber = parseRoundNumber(detail.roundNumber);
  const roundIndex = parseRoundNumber(detail.roundIndex);
  const normalizedRoundNumber = roundNumber ?? roundIndex;
  if (typeof normalizedRoundNumber === "number") {
    roundState.setRoundNumber(normalizedRoundNumber, { emitLegacyEvent: false });
    // Skip round counter update in CLI mode (CLI handles its own format with target)
    if (!isCliMode()) {
      try {
        scoreboard.updateRoundCounter(normalizedRoundNumber);
      } catch (error) {
        // Log scoreboard update failures for debugging while preventing crashes
        if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
          console.warn("[uiService] Failed to update round counter", error);
        }
      }
    }
  } else {
    try {
      scoreboard.clearRoundCounter();
    } catch {}
  }
}

function handleRoundOutcome(event) {
  const text = event?.detail?.text;
  if (typeof text === "undefined" || text === null) return;
  const outcomeText = typeof text === "string" ? text : String(text);
  try {
    scoreboard.showMessage(outcomeText.length > 0 ? outcomeText : "", { outcome: true });
  } catch {}
}

function handleRoundMessage(event) {
  const text = event?.detail?.text;
  if (typeof text === "undefined" || text === null) return;
  const messageText = typeof text === "string" ? text : String(text);
  try {
    scoreboard.showMessage(messageText.length > 0 ? messageText : "");
  } catch {}
}

function handleMessageClear() {
  try {
    scoreboard.clearMessage();
  } catch {}
}

function handleTimerShow(event) {
  const seconds = extractSeconds(event?.detail || {});
  if (seconds === null) return;
  try {
    scoreboard.updateTimer(seconds);
  } catch {}
}

function handleTimerTick(event) {
  const seconds = extractSeconds(event?.detail || {});
  if (seconds === null) return;
  try {
    scoreboard.updateTimer(seconds);
  } catch {}
}

function handleTimerHide() {
  try {
    scoreboard.clearTimer();
  } catch {}
}

function handleScoreUpdate(event) {
  const { player, opponent } = event?.detail || {};
  const playerIsNumber = typeof player === "number" && Number.isFinite(player);
  const opponentIsNumber = typeof opponent === "number" && Number.isFinite(opponent);
  if (!playerIsNumber || !opponentIsNumber) {
    return;
  }
  try {
    scoreboard.updateScore(player, opponent);
  } catch {}
}

function extractScorePair(detail) {
  const scores = detail?.scores;
  if (scores) {
    return {
      player: scores.player,
      opponent: scores.opponent
    };
  }
  return {
    player: detail?.playerScore ?? detail?.player,
    opponent: detail?.opponentScore ?? detail?.opponent
  };
}

function handleDomainScoreUpdate(event) {
  const { player, opponent } = extractScorePair(event?.detail);
  handleScoreUpdate({ detail: { player, opponent } });
}

function handleAutoSelectShow(event) {
  const stat = event?.detail?.stat;
  if (typeof stat !== "string" || stat.length === 0) return;
  try {
    scoreboard.showAutoSelect(stat);
  } catch {}
}

function handleTempMessage(event) {
  const text = event?.detail?.text;
  if (typeof text !== "string") return;
  try {
    scoreboard.showTemporaryMessage(text);
  } catch {}
}

function bindScoreboardEventHandlers() {
  onBattleEvent("display.round.start", handleRoundStart);
  onBattleEvent("display.round.message", handleRoundMessage);
  onBattleEvent("display.round.outcome", handleRoundOutcome);
  onBattleEvent("display.message.clear", handleMessageClear);
  onBattleEvent("display.timer.show", handleTimerShow);
  onBattleEvent("display.timer.tick", handleTimerTick);
  onBattleEvent("display.timer.hide", handleTimerHide);
  onBattleEvent("display.score.update", handleScoreUpdate);
  onBattleEvent("round.evaluated", handleDomainScoreUpdate);
  onBattleEvent("match.concluded", handleDomainScoreUpdate);
  onBattleEvent("display.autoSelect.show", handleAutoSelectShow);
  onBattleEvent("display.tempMessage", handleTempMessage);
  // Also listen to cooldown timer ticks to update the timer display during cooldown
  onBattleEvent("cooldown.timer.tick", (e) => {
    const ms = Number(e?.detail?.remainingMs);
    if (Number.isFinite(ms)) {
      const seconds = Math.max(0, Math.round(ms / 1000));
      handleTimerTick({ detail: { secondsRemaining: seconds } });
    }
  });

  const wrappedUpdateRoundCounter = (roundNumber) => {
    if (!isCliMode()) {
      scoreboard.updateRoundCounter(roundNumber);
    }
  };

  scoreboardBindingsReady = roundState.wireIntoScoreboardAdapter({
    updateRoundCounter: wrappedUpdateRoundCounter,
    clearRoundCounter: scoreboard.clearRoundCounter
  });
}

// --- Event bindings ---
function bindUIServiceEventHandlers() {
  // Register listeners exactly once per EventTarget instance
  onBattleEvent("scoreboardClearMessage", () => {
    try {
      scoreboard.clearMessage();
    } catch (err) {
      console.error("Error clearing scoreboard message:", err);
    }
  });

  onBattleEvent("scoreboardShowMessage", (e) => {
    try {
      scoreboard.showMessage(e.detail);
    } catch (err) {
      console.error("Error in scoreboard.showMessage:", err);
    }
  });

  onBattleEvent("debugPanelUpdate", () => {
    try {
      updateDebugPanel();
    } catch (err) {
      console.error("Error updating debug panel:", err);
    }
  });

  // Ensure any summary or per-round UI cleans up correctly between rounds
  onBattleEvent("roundReset", () => {
    try {
      // Close any open summary modals to avoid stale data bleed
      const modalEl = document.querySelector(".modal");
      if (modalEl?.close) modalEl.close();
      // Clear scoreboard messages
      scoreboard.clearMessage?.();
      try {
        document.body?.removeAttribute?.("data-stat-selected");
      } catch {}
      // Broadcast a UI reset for components that subscribe
      emitBattleEvent("ui.roundReset");
    } catch {}
  });
}

/**
 * Bind scoreboard event handlers once per battle event target.
 *
 * @pseudocode
 * 1. Resolve the current battle EventTarget.
 * 2. Track bound targets in a WeakSet keyed on the global namespace.
 * 3. Skip binding if the target has already been handled.
 * 4. Otherwise register scoreboard handlers and wire the round store.
 *
 * @returns {Promise<void>} Resolves when scoreboard bindings are wired.
 */
export function bindScoreboardEventHandlersOnce() {
  let shouldBind = true;
  try {
    const KEY = "__cbScoreboardBoundTargets";
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[KEY] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  if (shouldBind) {
    bindScoreboardEventHandlers();
  }
  return scoreboardBindingsReady;
}

/**
 * Bind UI service handlers once per battle event target.
 *
 * Mirrors the previous module-level binding behavior but defers execution
 * until explicitly invoked so tests can control when listeners register.
 *
 * @pseudocode
 * 1. Assume binding should occur; fetch the shared battle event target.
 * 2. Look up (or create) the WeakSet tracking bound targets.
 * 3. If the target is already tracked, skip binding.
 * 4. Otherwise add the target and delegate to `bindUIServiceEventHandlers`.
 *
 * @returns {void}
 */
export function bindUIServiceEventHandlersOnce() {
  let shouldBind = true;
  try {
    const KEY = "__cbUiServiceBoundTargets";
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[KEY] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  if (shouldBind) {
    bindUIServiceEventHandlers();
  }
}
