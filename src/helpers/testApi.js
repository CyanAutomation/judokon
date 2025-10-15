/**
 * Test API for direct access to battle state, timers, and component internals.
 *
 * This module exposes functions that tests can use to directly control and inspect
 * the application state without relying on DOM manipulation or timing dependencies.
 *
 * @pseudocode
 * 1. Check if running in test environment (NODE_ENV=test or feature flag enabled)
 * 2. Expose battle state machine access (get state, dispatch events, get snapshot)
 * 3. Expose timer controls (set countdown, skip cooldown, pause/resume timers)
 * 4. Expose initialization promises for reliable test setup
 * 5. Expose component state inspection helpers
 */

import { getBattleStateMachine } from "./classicBattle/orchestrator.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";
import { isEnabled } from "./featureFlags.js";
import { resolveRoundForTest as resolveRoundForCliTest } from "../pages/battleCLI/testSupport.js";
import { isDevelopmentEnvironment } from "./environment.js";
import {
  getPointsToWin as facadeGetPointsToWin,
  getRoundsPlayed as facadeGetRoundsPlayed,
  getScores as facadeGetScores,
  requireEngine,
  setPointsToWin as facadeSetPointsToWin
} from "./battleEngineFacade.js";

const FRAME_DELAY_MS = 16;

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readScoreboardSnapshot() {
  try {
    const node = document.getElementById("score-display");
    if (!node) return null;

    const dataset = {};
    if (node.dataset) {
      for (const [key, val] of Object.entries(node.dataset)) {
        dataset[key] = val;
      }
    }

    const pickFromDataset = (keys) => {
      for (const key of keys) {
        const numeric = toFiniteNumber(dataset[key]);
        if (numeric !== null) return numeric;
      }
      return null;
    };

    const text = String(node.textContent ?? "");
    let player = pickFromDataset(["player", "playerScore", "you", "user"]);
    let opponent = pickFromDataset(["opponent", "opponentScore", "cpu", "enemy"]);

    if (player === null || opponent === null) {
      const match = text.match(/You:[^0-9]*([0-9]+)[\s\S]*Opponent:[^0-9]*([0-9]+)/i);
      if (match) {
        player = toFiniteNumber(match[1]);
        opponent = toFiniteNumber(match[2]);
      }
    }

    const endedAttr = dataset.matchEnded ?? node.getAttribute?.("data-match-ended");
    const matchEnded =
      typeof endedAttr === "string"
        ? endedAttr.trim().toLowerCase() === "true"
        : endedAttr === true;

    return {
      text,
      dataset,
      player,
      opponent,
      matchEnded
    };
  } catch {
    return null;
  }
}

function readMatchEndModalSnapshot() {
  try {
    const modal = document.getElementById("match-end-modal");
    if (!modal) {
      return { present: false, visible: false, title: null, ariaHidden: null };
    }

    const ariaHidden = modal.getAttribute("aria-hidden");
    const computed =
      typeof window !== "undefined" && typeof window.getComputedStyle === "function"
        ? window.getComputedStyle(modal)
        : null;

    let visible = modal.hidden !== true;
    if (ariaHidden && ariaHidden !== "false") {
      visible = false;
    }
    if (computed) {
      const opacity = toFiniteNumber(computed.opacity);
      if (
        computed.display === "none" ||
        computed.visibility === "hidden" ||
        computed.pointerEvents === "none" ||
        (opacity !== null && opacity <= 0.01)
      ) {
        visible = false;
      }
    }

    const title = modal.querySelector?.("#match-end-title")?.textContent?.trim() ?? null;

    return { present: true, visible, title, ariaHidden };
  } catch {
    return { present: false, visible: false, title: null, ariaHidden: null };
  }
}

function collectMatchUiSnapshot() {
  let battleState = null;
  try {
    battleState = document.body?.dataset?.battleState ?? null;
  } catch {
    battleState = null;
  }

  return {
    battleState,
    scoreboard: readScoreboardSnapshot(),
    modal: readMatchEndModalSnapshot()
  };
}

function normalizeMatchScores(primary, scoreboard) {
  const ensureScores = (candidate) => {
    if (!candidate || typeof candidate !== "object") return null;
    const player = toFiniteNumber(candidate.player ?? candidate.playerScore);
    const opponent = toFiniteNumber(candidate.opponent ?? candidate.opponentScore);
    if (player === null || opponent === null) return null;
    if (player < 0 || opponent < 0) return null;
    return { player, opponent };
  };

  const normalizedPrimary = ensureScores(primary);
  if (normalizedPrimary) return normalizedPrimary;

  if (scoreboard) {
    const fallback = ensureScores({
      player: scoreboard.player,
      opponent: scoreboard.opponent
    });
    if (fallback) return fallback;
  }

  return null;
}

async function waitForNextFrame() {
  try {
    if (typeof requestAnimationFrame === "function") {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      return;
    }
  } catch {}

  await new Promise((resolve) => setTimeout(resolve, FRAME_DELAY_MS));
}

function logDevWarning(message, error) {
  if (!isDevelopmentEnvironment()) return;

  try {
    console.warn(message, error);
  } catch {}
}

function logDevDebug(message, error) {
  if (!isDevelopmentEnvironment()) return;

  try {
    if (typeof console.debug === "function") {
      console.debug(message, error);
    } else {
      console.log(message, error);
    }
  } catch {}
}

function isAutomationNavigator(nav) {
  if (!nav) return false;

  try {
    if (nav.webdriver === true) {
      return true;
    }
  } catch {
    // Ignore property access errors – fall back to user agent heuristics.
  }

  let userAgent = "";

  try {
    if (typeof nav.userAgent === "string") {
      userAgent = nav.userAgent;
    }
  } catch {
    userAgent = "";
  }

  if (!userAgent) {
    try {
      const brands = nav.userAgentData?.brands;
      if (Array.isArray(brands)) {
        userAgent = brands.map((brand) => brand.brand).join(" ");
      }
    } catch {
      userAgent = "";
    }
  }

  if (!userAgent) return false;

  const normalizedAgent = userAgent.toLowerCase();
  if (normalizedAgent.includes("playwright")) {
    return true;
  }

  if (normalizedAgent.includes("headless")) {
    return true;
  }

  return false;
}

// Test mode detection
/**
 * Determine whether the runtime should expose the test API helpers.
 *
 * @pseudocode
 * 1. Check Node-based test flags (NODE_ENV, VITEST) for early exit.
 * 2. Inspect browser globals for explicit test flags or localhost URLs.
 * 3. Evaluate navigator automation hints (webdriver, headless UAs).
 * 4. Fallback to the enableTestMode feature flag toggle.
 *
 * @returns {boolean} True when test-only helpers should be mounted.
 * @internal
 */
export function isTestMode() {
  // Check for common test environment indicators
  if (typeof process !== "undefined") {
    if (process.env?.NODE_ENV === "test") return true;
    if (process.env?.VITEST) return true;
  }

  // Check for browser test indicators
  if (typeof window !== "undefined") {
    if (window.__TEST__) return true;
    if (
      window.location?.href?.includes("127.0.0.1") ||
      window.location?.href?.includes("localhost")
    )
      return true;

    if (isAutomationNavigator(window.navigator)) return true;
  }

  if (
    typeof window === "undefined" &&
    typeof navigator !== "undefined" &&
    isAutomationNavigator(navigator)
  ) {
    return true;
  }

  // Check feature flag
  try {
    return isEnabled("enableTestMode");
  } catch {
    return false;
  }
}

// State management API
const stateApi = {
  /**
   * Get current battle state directly from state machine
   * @returns {string|null} Current state name
   */
  getBattleState() {
    const tryGetState = (getter) => {
      try {
        const state = getter();
        return typeof state === "string" && state ? state : null;
      } catch {
        return null;
      }
    };

    const machineState = tryGetState(() => {
      const machine = getBattleStateMachine();
      return machine?.getState?.();
    });
    if (machineState) return machineState;

    const bodyState = tryGetState(() => document.body?.dataset?.battleState);
    if (bodyState) return bodyState;

    const attrState = tryGetState(() =>
      document.querySelector("[data-battle-state]")?.getAttribute("data-battle-state")
    );
    if (attrState) return attrState;

    return null;
  },

  /**
   * Dispatch an event to the battle state machine
   * @param {string} eventName - Event to dispatch
   * @param {any} payload - Optional payload
   * @returns {Promise<boolean>} Success status
   */
  async dispatchBattleEvent(eventName, payload) {
    try {
      const machine = getBattleStateMachine();
      if (!machine?.dispatch) return false;
      return await machine.dispatch(eventName, payload);
    } catch {
      return false;
    }
  },

  /**
   * Get complete state snapshot for testing
   * @returns {object} State snapshot with current state, previous state, event, and log
   */
  getStateSnapshot() {
    try {
      return getStateSnapshot();
    } catch {
      return { state: null, prev: null, event: null, log: [] };
    }
  },

  /**
   * Read the number of completed rounds reported by the engine.
   * @returns {number|null}
   */
  getRoundsPlayed() {
    try {
      const value = facadeGetRoundsPlayed();
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    } catch {
      return null;
    }
  },

  /**
   * Wait for a specific battle state to be reached
   * @param {string} stateName - Target state name
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when state reached, false on timeout
   * @pseudocode
   * 1. Resolve immediately when the requested state is already active.
   * 2. Subscribe to `battleStateChange` to observe upcoming transitions.
   * 3. Poll the state as a safety net while tracking the timeout window.
   * 4. Resolve `true` on observation, otherwise resolve `false` when time expires.
   */
  async waitForBattleState(stateName, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let finished = false,
        pollId,
        timeoutId,
        listener;
      const cleanup = (result) => {
        if (finished) return;
        finished = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (pollId) clearInterval(pollId);
        if (listener) {
          try {
            offBattleEvent("battleStateChange", listener);
          } catch {}
        }
        resolve(result);
      };
      const currentMatches = () => {
        try {
          return this.getBattleState() === stateName;
        } catch {
          return false;
        }
      };
      if (currentMatches()) {
        cleanup(true);
        return;
      }
      listener = (event) => {
        const detail = event?.detail ?? null;
        const nextState =
          typeof detail === "string"
            ? detail
            : (detail?.to ?? detail?.state ?? detail?.next ?? null);
        if (nextState === stateName) cleanup(true);
      };
      try {
        onBattleEvent("battleStateChange", listener);
      } catch {
        listener = undefined;
      }
      pollId = setInterval(() => {
        if (currentMatches()) cleanup(true);
        else if (Date.now() - startTime > timeout) cleanup(false);
      }, 50);
      timeoutId = setTimeout(() => cleanup(false), timeout);
    });
  },

  /**
   * Wait for the Next button to be marked ready and enabled.
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when ready, false on timeout
   */
  async waitForNextButtonReady(timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const cachedButtons = [];

      const refreshButtons = () => {
        // Keep only connected references between checks.
        for (let i = cachedButtons.length - 1; i >= 0; i -= 1) {
          if (!cachedButtons[i]?.isConnected) {
            cachedButtons.splice(i, 1);
          }
        }
        if (cachedButtons.length === 0) {
          const nextById = document.getElementById("next-button");
          const nextByRole = document.querySelector("[data-role='next-round']");
          if (nextById) {
            cachedButtons.push(nextById);
          }
          if (nextByRole && nextByRole !== nextById) {
            cachedButtons.push(nextByRole);
          }
        }
        return cachedButtons;
      };

      const isButtonReady = (btn) => {
        if (!btn) return false;
        const ariaDisabled =
          typeof btn.getAttribute === "function" ? btn.getAttribute("aria-disabled") : null;
        return (
          btn.dataset?.nextReady === "true" &&
          btn.dataset?.nextFinalized === "true" &&
          btn.disabled !== true &&
          ariaDisabled !== "true"
        );
      };

      const check = () => {
        try {
          const buttons = refreshButtons();
          if (buttons.some((btn) => isButtonReady(btn))) {
            resolve(true);
            return;
          }
        } catch {}

        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }

        setTimeout(check, 50);
      };

      check();
    });
  },

  /**
   * Await the match conclusion payload emitted via `match.concluded`.
   *
   * @param {number} timeout Timeout in milliseconds before aborting.
   * @returns {Promise<{eventName:string,detail:object|null,scores:{player:number,opponent:number}|null,winner:string|null,reason:string|null,elapsedMs:number,timedOut:boolean,dom:object|null}>}
   * @pseudocode
   * 1. Subscribe to `match.concluded` and start a timeout guard.
   * 2. When the event fires, wait a frame so UI bindings settle.
   * 3. Capture the emitted detail, normalized scores, and modal/scoreboard DOM state.
   * 4. Resolve with the collected payload; on timeout resolve with `timedOut=true`.
   */
  async waitForMatchCompletion(timeout = 10000) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      let finished = false;
      let timeoutId;
      let listenerBound = false;

      const finish = async (result) => {
        if (finished) return;
        finished = true;

        if (timeoutId) clearTimeout(timeoutId);
        if (listenerBound) {
          try {
            offBattleEvent("match.concluded", handleMatchConcluded);
          } catch {}
        }

        if (result.timedOut !== true) {
          await waitForNextFrame();
        }

        if (!result.dom) {
          result.dom = collectMatchUiSnapshot();
        }

        const detail = result.detail ?? null;
        const scores = normalizeMatchScores(
          result.scores ?? detail?.scores,
          result.dom?.scoreboard
        );

        resolve({
          eventName: "match.concluded",
          detail,
          scores,
          winner: result.winner ?? detail?.winner ?? null,
          reason: result.reason ?? detail?.reason ?? null,
          elapsedMs: Date.now() - startTime,
          timedOut: result.timedOut === true,
          dom: result.dom ?? null
        });
      };

      const handleMatchConcluded = (event) => {
        const detail = event?.detail ?? null;
        const scores = normalizeMatchScores(detail?.scores);
        finish({ detail, scores, timedOut: false });
      };

      try {
        onBattleEvent("match.concluded", handleMatchConcluded);
        listenerBound = true;
      } catch (error) {
        finish({
          detail: null,
          scores: null,
          timedOut: true,
          reason: error?.message ?? "listener-error"
        });
        return;
      }

      Promise.resolve()
        .then(() => {
          const immediateDom = collectMatchUiSnapshot();
          if (immediateDom?.scoreboard?.matchEnded) {
            finish({ detail: null, scores: null, timedOut: false, dom: immediateDom });
          }
        })
        .catch(() => {});

      timeoutId = setTimeout(() => {
        finish({ detail: null, scores: null, timedOut: true });
      }, timeout);
    });
  },

  /**
   * Simulate an external script reverting the round counter display.
   *
   * @param {{
   *   round?: number|null,
   *   text?: string|null,
   *   highestRound?: number|null
   * }} [options]
   * @returns {{
   *   success: boolean,
   *   previousText: string|null,
   *   previousHighest: string|null,
   *   appliedText: string|null,
   *   appliedHighest: string|null,
   *   reason?: string
   * }} Snapshot describing the interference effect.
   */
  simulateRoundCounterInterference(options = {}) {
    const { round = null, text = null, highestRound = null } = options || {};

    try {
      const counter = document.getElementById("round-counter");
      if (!counter) {
        return {
          success: false,
          previousText: null,
          previousHighest: null,
          appliedText: null,
          appliedHighest: null,
          reason: "round-counter-missing"
        };
      }

      const previousText = String(counter.textContent ?? "");
      const previousHighest = counter.dataset?.highestRound ?? null;

      let appliedText = null;
      if (typeof text === "string") {
        appliedText = text;
      } else if (Number.isFinite(Number(round)) && Number(round) > 0) {
        appliedText = `Round ${Number(round)}`;
      }

      if (appliedText !== null) {
        counter.textContent = appliedText;
      }

      let appliedHighest = null;
      const numericHighest = Number(highestRound);
      if (Number.isFinite(numericHighest) && numericHighest > 0) {
        appliedHighest = String(numericHighest);
        if (counter.dataset) {
          counter.dataset.highestRound = appliedHighest;
        }
      } else if (counter.dataset && "highestRound" in counter.dataset) {
        delete counter.dataset.highestRound;
      }

      return {
        success: true,
        previousText,
        previousHighest,
        appliedText,
        appliedHighest
      };
    } catch (error) {
      return {
        success: false,
        previousText: null,
        previousHighest: null,
        appliedText: null,
        appliedHighest: null,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Timer control API
const timerApi = {
  /**
   * Set countdown value directly without waiting for timer ticks
   * @param {number} seconds - Countdown value in seconds
   */
  setCountdown(seconds) {
    const applyCountdown = (value) => {
      try {
        const el = document.getElementById("cli-countdown");
        if (!el) return;
        const normalized = value ?? 0;
        el.dataset.remainingTime = String(normalized);
        try {
          el.setAttribute("data-remaining-time", String(normalized));
        } catch (err) {
          logDevWarning("Failed to set data-remaining-time attribute", err);
        }
        el.textContent = value !== null ? `Timer: ${String(normalized).padStart(2, "0")}` : "";
      } catch (err) {
        logDevWarning("Failed to apply countdown value", err);
      }
    };

    try {
      // Use existing battleCLI helper if available
      if (typeof window !== "undefined" && window.__battleCLIinit?.setCountdown) {
        const battleCLI = window.__battleCLIinit;
        let delegationSucceeded = false;

        try {
          if (battleCLI.__freezeUntil !== undefined) {
            battleCLI.__freezeUntil = 0;
          }
        } catch {}

        try {
          battleCLI.setCountdown(seconds);
          delegationSucceeded = true;
        } catch (err) {
          logDevDebug("Failed to delegate countdown to battleCLI", err);
        } finally {
          try {
            if (battleCLI && battleCLI.__freezeUntil !== undefined && !delegationSucceeded) {
              battleCLI.__freezeUntil = Date.now() + 500;
            }
          } catch {}
        }

        applyCountdown(seconds);
        return;
      }

      applyCountdown(seconds);
    } catch (err) {
      logDevWarning("Failed to set countdown via timer API", err);
    }
  },

  /**
   * Retrieve the active countdown value displayed in the UI.
   *
   * @pseudocode
   * 1. Locate the timer element using the shared data-testid/id selectors.
   * 2. Attempt to parse a numeric value from dataset attributes (`data-remaining-time`).
   * 3. Fallback to parsing the text content that follows the `Time Left: {n}s` pattern.
   * 4. Return the parsed integer when available; otherwise return `null` to indicate no countdown.
   *
   * @returns {number|null} Countdown seconds or `null` when unavailable.
   */
  getCountdown() {
    try {
      if (typeof document === "undefined") return null;

      const timerEl = document.querySelector('[data-testid="next-round-timer"]');
      if (!timerEl) return null;

      const parseTimerValue = (value) => {
        const numeric = Number.parseInt(String(value ?? ""), 10);
        return Number.isNaN(numeric) ? null : numeric;
      };

      const datasetValue =
        timerEl.getAttribute("data-remaining-time") ?? timerEl.dataset?.remainingTime;
      const fromDataset = parseTimerValue(datasetValue);
      if (fromDataset !== null) {
        return fromDataset;
      }

      const textMatch = (timerEl.textContent || "").match(/Time Left:\s*(\d+)s/i);
      if (!textMatch) return null;

      return parseTimerValue(textMatch[1]);
    } catch {
      return null;
    }
  },

  /**
   * Skip cooldown immediately without waiting
   */
  skipCooldown() {
    try {
      emitBattleEvent("countdownFinished");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Complete stat selection timer immediately
   */
  expireSelectionTimer() {
    try {
      emitBattleEvent("statSelectionStalled");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Override the simulated opponent resolution delay used by the battle engine.
   * @param {number|null|undefined} delayMs - Delay in milliseconds (reset when nullish)
   * @returns {boolean} True when the delay override is applied
   */
  setOpponentResolveDelay(delayMs) {
    try {
      if (typeof window === "undefined") return false;

      if (delayMs === null || delayMs === undefined) {
        if (Object.prototype.hasOwnProperty.call(window, "__OPPONENT_RESOLVE_DELAY_MS")) {
          delete window.__OPPONENT_RESOLVE_DELAY_MS;
        }
        return true;
      }

      const numeric = Number(delayMs);
      if (!Number.isFinite(numeric) || numeric < 0) {
        throw new Error(`Invalid delay value: ${delayMs}. Must be a non-negative finite number.`);
      }

      window.__OPPONENT_RESOLVE_DELAY_MS = numeric;
      return true;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to set opponent resolve delay", error);
      }
      return false;
    }
  },

  /**
   * Read the currently configured opponent resolve delay override when present.
   * @returns {number|null} Delay value in milliseconds or null when unset.
   */
  getOpponentResolveDelay() {
    try {
      if (typeof window === "undefined") {
        return null;
      }

      const value = window.__OPPONENT_RESOLVE_DELAY_MS;
      if (value === undefined || value === null) {
        return null;
      }

      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to read opponent resolve delay", error);
      }
      return null;
    }
  },

  /**
   * Clear all active timers
   */
  clearAllTimers() {
    try {
      // Clear battleCLI timers if available
      if (typeof window !== "undefined" && window.__battleCLITimers) {
        Object.values(window.__battleCLITimers).forEach((timer) => {
          if (typeof timer === "number") {
            clearTimeout(timer);
            clearInterval(timer);
          }
        });
      }

      // Clear common timer elements
      const timerElements = ["selectionTimer", "cooldownTimer", "statTimeoutId", "autoSelectId"];
      timerElements.forEach((prop) => {
        if (typeof window !== "undefined" && window[prop]) {
          clearTimeout(window[prop]);
          clearInterval(window[prop]);
          window[prop] = null;
        }
      });

      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Minimal battle engine facade for Playwright specs.
 */
const engineApi = {
  /**
   * Access the current engine instance when available.
   * @returns {import("./battleEngineFacade.js").BattleEngine|null}
   */
  require() {
    try {
      return requireEngine();
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to require battle engine", error);
      }
      return null;
    }
  },

  /**
   * Override the points-to-win target for deterministic match setup.
   * @param {number} value - Desired target score.
   * @returns {boolean} True when the update succeeds.
   */
  setPointsToWin(value) {
    try {
      facadeSetPointsToWin(value);
      return true;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to set points to win", error);
      }
      return false;
    }
  },

  /**
   * Read the current points-to-win target from the engine.
   * @returns {number|null} Numeric target when available.
   */
  getPointsToWin() {
    try {
      const value = facadeGetPointsToWin();
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to get points to win", error);
      }
      return null;
    }
  },

  /**
   * Retrieve the current match score snapshot from the engine.
   * @returns {{ player: number, opponent: number }|null}
   */
  getScores() {
    try {
      const scores = facadeGetScores();
      if (!scores || typeof scores !== "object") {
        return null;
      }

      const player = Number(scores.player);
      const opponent = Number(scores.opponent);
      if (!Number.isFinite(player) || !Number.isFinite(opponent)) {
        return null;
      }

      return { player, opponent };
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to read engine scores", error);
      }
      return null;
    }
  },

  /**
   * Expose the rounds played counter as reported by the engine.
   * @returns {number|null}
   */
  getRoundsPlayed() {
    try {
      const value = facadeGetRoundsPlayed();
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to read rounds played", error);
      }
      return null;
    }
  }
};

const MIN_VIEWPORT_ZOOM = 0.1;
const MAX_VIEWPORT_ZOOM = 10;

// Viewport control API
const viewportApi = {
  /**
   * Adjust the document zoom level to simulate browser zoom in tests.
   *
   * @pseudocode
   * 1. Normalize the input zoom value (default to 1 when invalid or non-positive)
   * 2. Clamp the normalized zoom within the supported safety bounds (0.1 - 10)
   * 3. Ensure the document and body elements are available before mutating styles
   * 4. Apply or remove zoom styles plus tracking attributes based on the target zoom
   * 5. Log failures during development and return a boolean success indicator
   *
   * @param {number} zoomLevel - Target zoom multiplier (1 = 100%).
   * @returns {boolean} True when zoom is applied synchronously.
   */
  setZoom(zoomLevel = 1) {
    if (typeof document === "undefined") return false;

    const root = document.documentElement;
    const body = document.body;

    if (!root || !body) {
      return false;
    }

    const numericZoom = Number(zoomLevel);
    const normalizedZoom = Number.isFinite(numericZoom) && numericZoom > 0 ? numericZoom : 1;
    const clampedZoom = Math.min(Math.max(normalizedZoom, MIN_VIEWPORT_ZOOM), MAX_VIEWPORT_ZOOM);

    if (clampedZoom !== normalizedZoom) {
      logDevWarning(
        `Viewport zoom ${normalizedZoom} outside safe bounds; clamped to ${clampedZoom}.`
      );
    }

    try {
      if (clampedZoom === 1) {
        body.style.removeProperty("zoom");
        try {
          delete root.dataset.testZoom;
        } catch {}
        try {
          root.style.removeProperty("--test-zoom-scale");
        } catch {}
        return true;
      }

      const zoomString = String(clampedZoom);

      body.style.zoom = zoomString;
      try {
        root.dataset.testZoom = zoomString;
      } catch {}
      try {
        root.style.setProperty("--test-zoom-scale", zoomString);
      } catch {}

      return true;
    } catch (error) {
      logDevWarning("Failed to set viewport zoom", error);
      return false;
    }
  },

  /**
   * Clear any simulated zoom overrides applied during a test run.
   *
   * @pseudocode
   * 1. Delegate to `setZoom(1)` so the same validation and cleanup paths are reused
   * 2. Allow the shared implementation to handle DOM availability checks
   * 3. Rely on `setZoom` for style cleanup, attribute removal, and logging
   * 4. Return the boolean success status from the delegated call
   *
   * @returns {boolean} True when cleanup is completed.
   */
  resetZoom() {
    try {
      return this.setZoom(1);
    } catch (error) {
      logDevWarning("Failed to reset viewport zoom", error);
      return false;
    }
  }
};

// Component initialization API
const initApi = {
  /**
   * Check if battle components are fully initialized
   * @returns {boolean} True when ready
   */
  isBattleReady() {
    try {
      if (typeof window !== "undefined") {
        // Check for various readiness indicators
        return !!(
          window.battleStore ||
          window.battleReadyPromise ||
          window.__initCalled ||
          getBattleStateMachine()
        );
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Wait for battle components to be ready
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when ready, false on timeout
   */
  async waitForBattleReady(timeout = 10000) {
    return new Promise((resolve) => {
      if (this.isBattleReady()) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const check = () => {
        if (this.isBattleReady()) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }

        setTimeout(check, 100);
      };

      check();
    });
  },

  /**
   * Create a component factory for testing
   * @param {string} componentName - Name of component to create
   * @param {object} options - Component options
   * @returns {object} Component instance with test API access
   */
  createComponent(componentName) {
    try {
      const testApi = {
        getState: () => this.getComponentState(componentName),
        setState: (state) => this.setComponentState(componentName, state),
        triggerEvent: (event, data) => this.triggerComponentEvent(componentName, event, data),
        cleanup: () => this.cleanupComponent(componentName)
      };

      return {
        component: null, // Will be populated by specific component factories
        testApi,
        isTestMode: true
      };
    } catch {
      return { component: null, testApi: null, isTestMode: false };
    }
  },

  /**
   * Get internal state of a component
   * @param {string} componentName - Component identifier
   * @returns {any} Component state
   */
  getComponentState(componentName) {
    try {
      if (typeof window !== "undefined" && window.__testComponentStates) {
        return window.__testComponentStates[componentName];
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Set internal state of a component
   * @param {string} componentName - Component identifier
   * @param {any} state - New state
   */
  setComponentState(componentName, state) {
    try {
      if (typeof window !== "undefined") {
        if (!window.__testComponentStates) {
          window.__testComponentStates = {};
        }
        window.__testComponentStates[componentName] = state;
      }
    } catch {}
  },

  /**
   * Trigger component event for testing
   * @param {string} componentName - Component identifier
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  triggerComponentEvent(componentName, event, data) {
    try {
      if (typeof window !== "undefined" && window.__testComponentEvents) {
        const handler = window.__testComponentEvents[componentName]?.[event];
        if (typeof handler === "function") {
          handler(data);
        }
      }
    } catch {}
  },

  /**
   * Cleanup component test state
   * @param {string} componentName - Component identifier
   */
  cleanupComponent(componentName) {
    try {
      if (typeof window !== "undefined") {
        if (window.__testComponentStates) {
          delete window.__testComponentStates[componentName];
        }
        if (window.__testComponentEvents) {
          delete window.__testComponentEvents[componentName];
        }
      }
    } catch {}
  },

  /**
   * Get all available initialization promises
   * @returns {object} Object containing available promises
   */
  getInitPromises() {
    const promises = {};

    if (typeof window !== "undefined") {
      if (window.battleReadyPromise) promises.battle = window.battleReadyPromise;
      if (window.settingsReadyPromise) promises.settings = window.settingsReadyPromise;
      if (window.navReadyPromise) promises.nav = window.navReadyPromise;
      if (window.quoteReadyPromise) promises.quote = window.quoteReadyPromise;
      if (window.tooltipsReady) promises.tooltips = window.tooltipsReady;
    }

    return promises;
  }
};

let cachedRoundsEstimate = 0;
let lastBattleState = null;

// Component inspection API
const inspectionApi = {
  /**
   * Get battle store state for inspection
   * @returns {object|null} Battle store or null
   */
  getBattleStore() {
    try {
      return typeof window !== "undefined" ? window.battleStore : null;
    } catch {
      return null;
    }
  },

  /**
   * Reset cached inspection state used when computing rounds played.
   *
   * @pseudocode
   * 1. Reset cachedRoundsEstimate to 0 to clear any accumulated round counts
   * 2. Reset lastBattleState to null to clear state transition tracking
   * 3. Ensure each test starts with a clean slate for rounds computation
   * Note: Call this method in test setup (beforeEach) to ensure proper test isolation
   */
  resetCache() {
    cachedRoundsEstimate = 0;
    lastBattleState = null;
  },

  /**
   * Get debug information about the current battle state
   * @returns {object} Debug information
   */
  getDebugInfo() {
    try {
      const store = this.getBattleStore();
      const machine = getBattleStateMachine();
      const engineRounds = stateApi.getRoundsPlayed();
      const storeRounds = store ? toFiniteNumber(store.roundsPlayed) : null;
      const scoreboard = readScoreboardSnapshot();
      const scoreboardSum =
        scoreboard &&
        typeof scoreboard.player === "number" &&
        typeof scoreboard.opponent === "number"
          ? scoreboard.player + scoreboard.opponent
          : Number.isFinite(Number(scoreboard?.player)) &&
              Number.isFinite(Number(scoreboard?.opponent))
            ? Number(scoreboard.player) + Number(scoreboard.opponent)
            : null;
      const statSelected = (() => {
        try {
          return document.body?.dataset?.statSelected === "true";
        } catch {
          return false;
        }
      })();
      const scoreboardRounds =
        typeof scoreboardSum === "number" && Number.isFinite(scoreboardSum) ? scoreboardSum : null;
      const hasEngineRounds = typeof engineRounds === "number" && Number.isFinite(engineRounds);

      let roundsPlayed = hasEngineRounds ? engineRounds : null;
      if (
        typeof roundsPlayed === "number" &&
        Number.isFinite(roundsPlayed) &&
        scoreboardRounds !== null
      ) {
        roundsPlayed = Math.max(roundsPlayed, scoreboardRounds);
      } else if (scoreboardRounds !== null) {
        roundsPlayed = scoreboardRounds;
      } else if (typeof storeRounds === "number" && Number.isFinite(storeRounds)) {
        roundsPlayed = storeRounds;
      }

      const currentState = (() => {
        try {
          return document.body?.dataset?.battleState ?? null;
        } catch {
          return null;
        }
      })();

      if (
        (!currentState ||
          currentState === "roundSelectModal" ||
          currentState === "waitingForRoundSelection") &&
        !statSelected &&
        (scoreboardRounds === null || scoreboardRounds === 0) &&
        !hasEngineRounds
      ) {
        cachedRoundsEstimate = 0;
      }

      if (currentState === "roundDecision" && lastBattleState !== "roundDecision") {
        cachedRoundsEstimate = Math.max(cachedRoundsEstimate, 0) + 1;
      }

      if (
        currentState === "roundDecision" &&
        (!Number.isFinite(roundsPlayed) || roundsPlayed === 0)
      ) {
        roundsPlayed = cachedRoundsEstimate;
      } else if (statSelected && (!Number.isFinite(roundsPlayed) || roundsPlayed === 0)) {
        roundsPlayed = Math.max(cachedRoundsEstimate, 1);
      }

      if (typeof roundsPlayed === "number" && Number.isFinite(roundsPlayed)) {
        cachedRoundsEstimate = Math.max(cachedRoundsEstimate, roundsPlayed);
      }
      const computedRounds =
        typeof roundsPlayed === "number" && Number.isFinite(roundsPlayed)
          ? roundsPlayed
          : cachedRoundsEstimate > 0
            ? cachedRoundsEstimate
            : null;

      lastBattleState = currentState ?? lastBattleState;
      let snapshot = null;

      if (machine) {
        try {
          snapshot = getStateSnapshot();
        } catch {
          snapshot = null;
        }
      }

      const readStoreRounds = () => {
        const candidates = [];
        if (store && typeof store === "object") {
          candidates.push(store.roundsPlayed);
        }
        try {
          if (typeof window !== "undefined") {
            candidates.push(window.battleStore?.roundsPlayed);
          }
        } catch (error) {
          if (
            isDevelopmentEnvironment() &&
            typeof console !== "undefined" &&
            typeof console.debug === "function"
          ) {
            console.debug("testApi: Failed to read window.battleStore.roundsPlayed", error);
          }
        }

        const finite = candidates
          .map((value) => toFiniteNumber(value))
          .filter((value) => value !== null);
        return finite.length ? Math.max(...finite) : null;
      };

      const readEngineRounds = () => {
        try {
          if (engineApi?.getRoundsPlayed) {
            const value = toFiniteNumber(engineApi.getRoundsPlayed());
            if (value !== null) {
              return value;
            }
          }
        } catch {}
        return null;
      };

      const combinedRounds = [readStoreRounds(), readEngineRounds()].filter(
        (value) => value !== null
      );
      const aggregatedRounds = combinedRounds.length ? Math.max(...combinedRounds) : null;

      return {
        store: store
          ? {
              selectionMade: store.selectionMade,
              playerChoice: store.playerChoice,
              roundsPlayed: aggregatedRounds ?? computedRounds
            }
          : null,
        machine: machine
          ? {
              currentState: machine.getState?.(),
              hasDispatch: typeof machine.dispatch === "function"
            }
          : null,
        snapshot,
        dom: {
          battleState: document.body?.dataset?.battleState || null,
          hasNextButton: !!document.getElementById("next-button"),
          nextButtonReady: document.getElementById("next-button")?.dataset?.nextReady === "true"
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Battle CLI API
const cliApi = {
  /**
   * Resolve the active round through the classic battle machine.
   *
   * @param {object} [eventLike]
   * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
   * @pseudocode
   * dispatch = detail => stateApi.dispatchBattleEvent("roundResolved", detail)
   * emit = detail => emitBattleEvent("roundResolved", detail)
   * getStore = () => window.battleStore when available
   * return resolveRoundForCliTest(eventLike, { dispatch, emit, getStore })
   */
  async resolveRound(eventLike = {}) {
    const dispatch = (detail) => stateApi.dispatchBattleEvent("roundResolved", detail);
    const emit = (detail) => emitBattleEvent("roundResolved", detail);
    const getStore = () => {
      try {
        return typeof window !== "undefined" ? window.battleStore : null;
      } catch (error) {
        if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
          console.debug("Failed to access battleStore:", error);
        }
        return null;
      }
    };

    return resolveRoundForCliTest(eventLike, {
      dispatch,
      emit,
      getStore
    });
  },

  /**
   * Read the CLI verbose log and normalize the text entries.
   *
   * @returns {string[]} Array of timestamped state transition lines.
   * @pseudocode
   * 1. If `document` is unavailable, return an empty array.
   * 2. Locate `<pre id="cli-verbose-log">`; return empty array when missing.
   * 3. Split `textContent` into lines, trimming whitespace around each.
   * 4. Filter blank lines and return the resulting array.
   */
  readVerboseLog() {
    try {
      if (
        typeof document === "undefined" ||
        !document ||
        typeof document.getElementById !== "function"
      ) {
        return [];
      }

      const pre = document.getElementById("cli-verbose-log");
      if (!pre) return [];

      const textContent = pre.textContent;
      if (textContent === null || textContent === undefined) {
        return [];
      }

      return String(textContent)
        .split(/\r?\n/)
        .map((line) => String(line).trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      logDevWarning("Failed to read CLI verbose log", error);
      return [];
    }
  },

  /**
   * Deterministically complete the active CLI round without long waits.
   *
   * @param {object} [roundInput] - Event-like payload forwarded to resolveRound.
   * @param {{
   *   outcomeEvent?: string|null,
   *   expireSelection?: boolean,
   *   opponentResolveDelayMs?: number|undefined
   * }} [options]
   * @returns {Promise<{
   *   detail: object,
   *   outcomeEvent: string|null,
   *   outcomeDispatched: boolean,
   *   finalState: string|null,
   *   dispatched: boolean,
   *   emitted: boolean
   * }>}
   * @pseudocode
   * if options.expireSelection -> timerApi.expireSelectionTimer()
   * if options.opponentResolveDelayMs defined -> timerApi.setOpponentResolveDelay(value)
   * resolution = await resolveRound(roundInput)
   * if options.outcomeEvent -> dispatch outcome event with resolution.detail
   * return detail + dispatch flags + current battle state
   */
  async completeRound(roundInput = {}, options = {}) {
    const { outcomeEvent = null, expireSelection = true, opponentResolveDelayMs } = options ?? {};

    if (expireSelection && typeof timerApi.expireSelectionTimer === "function") {
      try {
        timerApi.expireSelectionTimer();
      } catch (error) {
        logDevDebug("Failed to expire selection timer", error);
      }
    }

    if (opponentResolveDelayMs !== undefined) {
      try {
        timerApi.setOpponentResolveDelay(opponentResolveDelayMs);
      } catch (error) {
        logDevDebug("Failed to set opponent resolve delay", error);
      }
    }

    const resolution = await this.resolveRound(roundInput);
    const detail = resolution?.detail ?? {};

    let outcomeDispatched = false;
    if (outcomeEvent) {
      try {
        const dispatched = await stateApi.dispatchBattleEvent(outcomeEvent, detail);
        outcomeDispatched = dispatched !== false;
      } catch {
        outcomeDispatched = false;
      }
    }

    return {
      detail,
      outcomeEvent,
      outcomeDispatched,
      finalState: stateApi.getBattleState(),
      dispatched: resolution?.dispatched ?? false,
      emitted: resolution?.emitted ?? false
    };
  }
};

// Main test API object
const testApi = {
  state: stateApi,
  cli: cliApi,
  timers: timerApi,
  init: initApi,
  inspect: inspectionApi,
  viewport: viewportApi,
  engine: engineApi
};

/**
 * Initialize the test API by exposing it on the window object.
 *
 * @pseudocode
 * 1. If not in test mode, exit early.
 * 2. If running in a browser, attach the `testApi` and its sub-APIs to
 *    properties on `window` for debugging.
 *
 * @returns {void}
 */
export function exposeTestAPI() {
  if (!isTestMode()) return;

  if (typeof window !== "undefined") {
    window.__TEST_API = testApi;

    // Also expose individual APIs for convenience
    window.__BATTLE_STATE_API = stateApi;
    window.__TIMER_API = timerApi;
    window.__INIT_API = initApi;
    window.__INSPECT_API = inspectionApi;
    window.__VIEWPORT_API = viewportApi;
    window.__ENGINE_API = engineApi;

    // Expose emitBattleEvent for test compatibility
    window.emitBattleEvent = emitBattleEvent;
  }
}

/**
 * Get the test API object (works in both browser and Node environments).
 *
 * @pseudocode
 * 1. Return the pre-created `testApi` singleton.
 *
 * @returns {object} Test API object
 */
export function getTestAPI() {
  return testApi;
}

// Auto-expose in test environments
if (isTestMode()) {
  exposeTestAPI();
}

export default testApi;
