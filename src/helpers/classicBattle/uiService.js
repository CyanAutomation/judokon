import * as scoreboard from "../setupScoreboard.js";
import { updateDebugPanel } from "./debugPanel.js";
import { onBattleEvent, getBattleEventTarget, emitBattleEvent } from "./battleEvents.js";
import { bindCountdownEventHandlersOnce } from "./timerService.js";
import * as battleEvents from "./battleEvents.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { setSkipHandler } from "./skipHandler.js";
import {
  computeOpponentPromptWaitBudget,
  waitForDelayedOpponentPromptDisplay,
  DEFAULT_PROMPT_POLL_INTERVAL_MS
} from "./opponentPromptWaiter.js";
import { isOpponentPromptReady } from "./opponentPromptTracker.js";
import { writeScoreDisplay } from "./scoreDisplay.js";
import { roundState } from "./roundState.js";

/** @type {{ timer: ReturnType<typeof createRoundTimer>, onExpired: Function }|null} */
let activeCountdown = null;
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

function handleCountdownExpired() {
  setSkipHandler(null);
  activeCountdown = null;
  battleEvents.emitBattleEvent("countdownFinished");
  battleEvents.emitBattleEvent("round.start");
}

/**
 * Synchronizes the score display on the scoreboard with the current scores from the battle engine.
 *
 * @pseudocode
 * 1. Retrieve the current `playerScore` and `opponentScore` from the battle engine using `getScores()`.
 * 2. If `scoreboard.updateScore` function is available, call it to update the scoreboard component.
 * 3. Locate the `#score-display` element in the DOM.
 * 4. If `#score-display` exists:
 *    a. Check for existing `<span>` elements with `data-side="player"` and `data-side="opponent"`.
 *    b. If these spans are not found, clear the `#score-display` content and create new `<span>` elements for player and opponent scores, appending them to `#score-display`.
 *    c. Update the `textContent` of the player and opponent score spans with the latest scores.
 * 5. Includes debug logging for test environments.
 *
 * @returns {void}
 */
export function syncScoreDisplay() {
  const { playerScore, opponentScore } = getScores();

  // Debug logging for tests
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      console.log("[DEBUG] syncScoreDisplay called:", { playerScore, opponentScore });
    }
  } catch {}

  // Update via the component API when available
  if (typeof scoreboard.updateScore === "function") {
    try {
      scoreboard.updateScore(playerScore, opponentScore);
    } catch {}
  }
  // Always ensure the DOM reflects current scores as a robust fallback
  try {
    writeScoreDisplay(playerScore, opponentScore);
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      const el = document.getElementById("score-display");
      if (el) {
        console.log("[DEBUG] syncScoreDisplay updated DOM:", el.textContent);
      }
    }
  } catch {}
}

/**
 * Show a match summary modal with result message and scores.
 *
 * @pseudocode
 * 1. Build title and score elements.
 * 2. Create Quit and Next buttons using `createButton`.
 * 3. Assemble the modal via `createModal` and append it to the DOM.
 * 4. Both buttons close and destroy the modal:
 *    - Quit navigates to `index.html`.
 *    - Next runs `onNext`.
 *
 * @param {{message: string, playerScore: number, opponentScore: number}} result
 * @param {Function} onNext Callback invoked when starting the next match.
 * @returns {ReturnType<typeof createModal>} Created modal instance.
 */
export function showMatchSummaryModal(result, onNext) {
  const title = document.createElement("h2");
  title.id = "match-summary-title";
  title.textContent = result.message;

  const scoreEl = document.createElement("p");
  scoreEl.id = "match-summary-score";
  scoreEl.textContent = `Final Score – You: ${result.playerScore} Opponent: ${result.opponentScore}`;

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const quit = createButton("Quit Match", {
    id: "match-summary-quit",
    className: "secondary-button"
  });

  const next = createButton("Next Match", { id: "match-summary-next" });

  actions.append(quit, next);

  const frag = document.createDocumentFragment();
  frag.append(title, scoreEl, actions);

  const modal = createModal(frag, { labelledBy: title });

  quit.addEventListener("click", () => {
    modal.close();
    modal.destroy();
    // Navigate to home (robust base path handling)
    navigateToHome();
  });

  next.addEventListener("click", () => {
    modal.close();
    modal.destroy();
    if (typeof onNext === "function") onNext();
  });

  document.body.appendChild(modal.element);
  modal.open();
  return modal;
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
  try {
    bindCountdownEventHandlersOnce();
  } catch {}
}
