import * as snackbar from "./showSnackbar.js";
import * as scoreboard from "./setupScoreboard.js";
import { emitBattleEvent } from "./classicBattle/battleEvents.js";
import {
  getOpponentPromptTimestamp,
  getOpponentPromptMinDuration,
  isOpponentPromptReady
} from "./classicBattle/opponentPromptTracker.js";
import { t } from "./i18n.js";
import { clampToPositiveTimestamp, toPositiveNumber } from "./utils/positiveNumbers.js";

// Timing constants
const DEFAULT_PROMPT_POLL_INTERVAL_MS = 16;
const MINIMUM_TIMESTAMP_EPSILON = Number.EPSILON;
const MIN_COUNTDOWN_VALUE = 0;
const INVALID_COUNTDOWN_SENTINEL = -1;

/**
 * Get a global function with proper bindings and fallback.
 *
 * @pseudocode
 * 1. Check if the function exists on window object.
 * 2. If available, bind it to window to preserve context.
 * 3. Otherwise, fall back to the provided function.
 *
 * @param {string} name - Function name to retrieve.
 * @param {Function} fallback - Fallback function if not found on window.
 * @returns {Function} Bound function or fallback.
 */
function safeGlobalFunction(name, fallback) {
  try {
    if (typeof window !== "undefined" && typeof window[name] === "function") {
      return window[name].bind(window);
    }
  } catch {}
  return fallback;
}

const defaultSetTimeout = safeGlobalFunction("setTimeout", setTimeout);
const defaultClearTimeout = safeGlobalFunction("clearTimeout", clearTimeout);

const defaultNow = () => {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      const timestamp = performance.now();
      return clampToPositiveTimestamp(timestamp);
    }
  } catch {
    // performance.now() may not be available in certain runtimes (e.g. Node.js without perf hooks)
  }
  try {
    const timestamp = Date.now();
    return clampToPositiveTimestamp(timestamp);
  } catch {
    // Date.now() can fail if the global Date object is unavailable or polyfilled incorrectly
  }
  return MINIMUM_TIMESTAMP_EPSILON;
};

/**
 * Check if running in Vitest test environment.
 *
 * @pseudocode
 * 1. Safely check for process.env.VITEST variable.
 * 2. Return false if not in Node.js or variable unavailable.
 *
 * @returns {boolean} True if running under Vitest.
 */
function isVitestEnvironment() {
  try {
    return typeof process !== "undefined" && !!process.env?.VITEST;
  } catch {
    return false;
  }
}

const derivePromptPollRetries = (maxPromptWait, promptPollInterval) => {
  if (!Number.isFinite(maxPromptWait) || maxPromptWait <= 0) {
    return 0;
  }
  if (!Number.isFinite(promptPollInterval) || promptPollInterval <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(maxPromptWait / promptPollInterval));
};

/**
 * Normalize timing and prompt delay options.
 *
 * @pseudocode
 * 1. Convert option values to positive numbers with defaults.
 * 2. Derive poll retry count from max wait and interval.
 * 3. Select appropriate timer and now functions.
 *
 * @param {{
 *   promptPollIntervalMs?: number,
 *   maxPromptWaitMs?: number,
 *   waitForOpponentPrompt?: boolean,
 *   setTimeoutFn?: Function,
 *   clearTimeoutFn?: Function,
 *   now?: Function
 * }} [options]
 * @returns {{
 *   waitForPromptOption: boolean,
 *   promptPollInterval: number,
 *   maxPromptWait: number,
 *   maxPromptPollRetries: number,
 *   setTimeoutFn: Function,
 *   clearTimeoutFn: Function,
 *   now: Function
 * }}
 */
const normalizePromptDelayOptions = (options = {}) => {
  const promptPollInterval = toPositiveNumber(
    options?.promptPollIntervalMs,
    DEFAULT_PROMPT_POLL_INTERVAL_MS
  );
  const maxPromptWait = toPositiveNumber(options?.maxPromptWaitMs, MIN_COUNTDOWN_VALUE);
  return {
    waitForPromptOption: options?.waitForOpponentPrompt === true,
    promptPollInterval,
    maxPromptWait,
    maxPromptPollRetries: derivePromptPollRetries(maxPromptWait, promptPollInterval),
    setTimeoutFn:
      typeof options?.setTimeoutFn === "function" ? options.setTimeoutFn : defaultSetTimeout,
    clearTimeoutFn:
      typeof options?.clearTimeoutFn === "function" ? options.clearTimeoutFn : defaultClearTimeout,
    now: typeof options?.now === "function" ? options.now : defaultNow
  };
};

/**
 * Check if an opponent prompt is currently active.
 *
 * @pseudocode
 * 1. Check if isOpponentPromptReady function indicates ready state.
 * 2. Otherwise, verify prompt timestamp is valid and positive.
 * 3. Return false if either check fails.
 *
 * @returns {boolean} True if an active prompt exists.
 */
function hasActivePrompt() {
  try {
    if (isOpponentPromptReady()) {
      return true;
    }
    const timestamp = Number(getOpponentPromptTimestamp());
    return Number.isFinite(timestamp) && timestamp > MIN_COUNTDOWN_VALUE;
  } catch {}
  return false;
}

/**
 * Compute remaining delay milliseconds for prompt constraint.
 *
 * @pseudocode
 * 1. Get minimum prompt duration and last prompt timestamp.
 * 2. Calculate elapsed time since last prompt.
 * 3. Return max of 0 or (min duration - elapsed).
 *
 * @param {Function} nowFn - Function that returns current timestamp.
 * @returns {number} Remaining milliseconds, or 0 if constraint satisfied.
 */
function computeRemainingPromptDelayMs(nowFn) {
  try {
    const minDuration = Number(getOpponentPromptMinDuration());
    if (!Number.isFinite(minDuration) || minDuration <= MIN_COUNTDOWN_VALUE) {
      return MIN_COUNTDOWN_VALUE;
    }
    const lastPrompt = Number(getOpponentPromptTimestamp());
    if (!Number.isFinite(lastPrompt) || lastPrompt <= MIN_COUNTDOWN_VALUE) {
      return MIN_COUNTDOWN_VALUE;
    }
    const elapsed = nowFn() - lastPrompt;
    if (!Number.isFinite(elapsed)) {
      return MIN_COUNTDOWN_VALUE;
    }
    return Math.max(MIN_COUNTDOWN_VALUE, minDuration - elapsed);
  } catch {}
  return MIN_COUNTDOWN_VALUE;
}

const SUPPRESSED_BATTLE_STATES = new Set(["waitingForPlayerAction", "roundDecision"]);

function isSelectionOrDecisionPhase() {
  try {
    const battleState = document?.body?.dataset?.battleState;
    if (typeof battleState !== "string") {
      return false;
    }
    return SUPPRESSED_BATTLE_STATES.has(battleState);
  } catch {}
  return false;
}

function isOpponentPromptWindowActive(nowFn = defaultNow) {
  try {
    if (!isOpponentPromptReady()) {
      return false;
    }
    const promptTimestamp = Number(getOpponentPromptTimestamp());
    if (!Number.isFinite(promptTimestamp) || promptTimestamp <= MIN_COUNTDOWN_VALUE) {
      return false;
    }
    const minDuration = Number(getOpponentPromptMinDuration());
    if (!Number.isFinite(minDuration) || minDuration <= MIN_COUNTDOWN_VALUE) {
      return false;
    }
    const elapsed = nowFn() - promptTimestamp;
    if (!Number.isFinite(elapsed)) {
      return false;
    }
    return elapsed < minDuration;
  } catch {}
  return false;
}

/**
 * Create initial state for prompt delay controller.
 *
 * @pseudocode
 * 1. Initialize config and pending state.
 * 2. Set up queue for deferred callbacks.
 * 3. Prepare poll retry counter and deadline tracker.
 *
 * @param {object} config - Normalized timing configuration.
 * @returns {{
 *   config: object,
 *   pendingDelayId: number|null,
 *   queuedPayload: object|null,
 *   promptWaitDeadline: number,
 *   promptWaitPollsRemaining: number
 * }}
 */
function createPromptDelayState(config) {
  return {
    config,
    pendingDelayId: null,
    /**
     * @type {{
     *   value: number,
     *   suppressEvents: boolean,
     *   onReady: (value: number, options: { suppressEvents: boolean }) => void
     * } | null}
     */
    queuedPayload: null,
    promptWaitDeadline: 0,
    promptWaitPollsRemaining: config.maxPromptPollRetries
  };
}

/**
 * Clear any pending timeout ID.
 *
 * @pseudocode
 * 1. If timeout is pending, clear it.
 * 2. Set ID to null to mark state as cleared.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {void}
 */
function clearPendingTimeout(state) {
  if (state.pendingDelayId !== null) {
    try {
      state.config.clearTimeoutFn(state.pendingDelayId);
    } catch {}
    state.pendingDelayId = null;
  }
}

/**
 * Reset prompt wait state to initial values.
 *
 * @pseudocode
 * 1. Clear deadline timestamp.
 * 2. Reset poll retry counter to max.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {void}
 */
function resetPromptWaitState(state) {
  state.promptWaitDeadline = 0;
  state.promptWaitPollsRemaining = state.config.maxPromptPollRetries;
}

/**
 * Flush queued tick callback and reset state.
 *
 * @pseudocode
 * 1. Extract callback from queue.
 * 2. Clear queue and timer state.
 * 3. Invoke callback with suppression flag if present.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {void}
 */
function flushQueue(state) {
  const payload = state.queuedPayload;
  state.queuedPayload = null;
  resetPromptWaitState(state);
  clearPendingTimeout(state);
  if (payload?.onReady) {
    payload.onReady(payload.value, {
      suppressEvents: payload.suppressEvents === true
    });
  }
}

/**
 * Schedule a delay before flushing the queue.
 *
 * @pseudocode
 * 1. If delay is zero or timer unavailable, flush immediately.
 * 2. Otherwise, schedule timer and store ID.
 * 3. Flush when timer expires.
 *
 * @param {object} state - Prompt delay controller state.
 * @param {number} delay - Milliseconds to delay.
 * @returns {void}
 */
function scheduleDelay(state, delay) {
  if (delay <= 0 || typeof state.config.setTimeoutFn !== "function") {
    flushQueue(state);
    return;
  }
  clearPendingTimeout(state);
  try {
    state.pendingDelayId = state.config.setTimeoutFn(() => {
      state.pendingDelayId = null;
      flushQueue(state);
    }, delay);
  } catch {
    state.pendingDelayId = null;
    flushQueue(state);
  }
}

function processQueue(state) {
  if (!state.queuedPayload) {
    return;
  }

  if (handlePromptWaiting(state)) {
    return;
  }

  const delay = Math.max(0, computeRemainingPromptDelayMs(state.config.now));
  scheduleDelay(state, delay);
}

/**
 * Schedule a poll to check if prompt is ready.
 *
 * @pseudocode
 * 1. Return false if timer unavailable.
 * 2. Schedule poll callback for poll interval.
 * 3. Return true on success, false if scheduling fails.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {boolean} True if poll scheduled successfully.
 */
function schedulePromptPoll(state) {
  if (typeof state.config.setTimeoutFn !== "function") {
    return false;
  }

  clearPendingTimeout(state);
  try {
    state.pendingDelayId = state.config.setTimeoutFn(() => {
      state.pendingDelayId = null;
      processQueue(state);
    }, state.config.promptPollInterval);
    return true;
  } catch {
    state.pendingDelayId = null;
    return false;
  }
}

/**
 * Check if the prompt wait deadline has been reached.
 *
 * @pseudocode
 * 1. If waiting is not constrained by time (max wait disabled), return true.
 * 2. Otherwise, compare current time against deadline timestamp.
 * 3. Return true if deadline is set and current time has passed it.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {boolean} True if deadline reached or time limit disabled.
 */
function isPromptWaitDeadlineReached(state) {
  const canWaitForPrompt = state.config.maxPromptWait > MIN_COUNTDOWN_VALUE;
  if (!canWaitForPrompt) {
    return true;
  }
  const hasDeadlineInitialized = state.promptWaitDeadline > MIN_COUNTDOWN_VALUE;
  return hasDeadlineInitialized && state.config.now() >= state.promptWaitDeadline;
}

/**
 * Check if the maximum number of prompt poll retries has been exhausted.
 *
 * @pseudocode
 * 1. If polling is not constrained (max retries disabled), return false.
 * 2. Otherwise, check if remaining polls have been decremented to or below zero.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {boolean} True if poll limit has been reached.
 */
function isPromptPollLimitReached(state) {
  const canWaitForPrompt = state.config.maxPromptWait > MIN_COUNTDOWN_VALUE;
  if (!canWaitForPrompt || state.config.maxPromptPollRetries <= MIN_COUNTDOWN_VALUE) {
    return false;
  }
  return state.promptWaitPollsRemaining <= MIN_COUNTDOWN_VALUE;
}

/**
 * Check if prompt waiting should begin (initialize deadline and retries).
 *
 * @pseudocode
 * 1. If waiting is not enabled or no time/poll limits, return false.
 * 2. Check if deadline is not yet initialized (zero).
 * 3. Initialize deadline to now + maxPromptWait and reset poll counter.
 * 4. Return true to signal initialization.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {boolean} True if waiting should begin.
 */
function canBeginWaitingForPrompt(state) {
  const canWaitForPrompt = state.config.maxPromptWait > MIN_COUNTDOWN_VALUE;
  const hasDeadlineInitialized = state.promptWaitDeadline !== MIN_COUNTDOWN_VALUE;
  if (!canWaitForPrompt || hasDeadlineInitialized) {
    return false;
  }
  state.promptWaitDeadline = state.config.now() + state.config.maxPromptWait;
  state.promptWaitPollsRemaining = state.config.maxPromptPollRetries;
  return true;
}

function handlePromptWaiting(state) {
  if (!state.config.waitForPromptOption) {
    const hasDeadlineInitialized = state.promptWaitDeadline !== MIN_COUNTDOWN_VALUE;
    if (hasDeadlineInitialized && hasActivePrompt()) {
      resetPromptWaitState(state);
    }
    return false;
  }

  if (hasActivePrompt()) {
    resetPromptWaitState(state);
    return false;
  }

  canBeginWaitingForPrompt(state);

  if (isPromptWaitDeadlineReached(state) || isPromptPollLimitReached(state)) {
    resetPromptWaitState(state);
    return false;
  }

  const canWaitForPrompt = state.config.maxPromptWait > MIN_COUNTDOWN_VALUE;
  if (!canWaitForPrompt) {
    return false;
  }

  const scheduled = schedulePromptPoll(state);
  if (scheduled && state.config.maxPromptPollRetries > MIN_COUNTDOWN_VALUE) {
    state.promptWaitPollsRemaining -= 1;
  }
  return scheduled;
}

function queueTickInternal(state, value, options = {}, onReady) {
  const suppressEvents = options?.suppressEvents === true;
  state.queuedPayload = { value, suppressEvents, onReady };

  processQueue(state);
}

/**
 * Clear all pending state (timers, queue, deadlines).
 *
 * @pseudocode
 * 1. Cancel any pending timeout.
 * 2. Clear queued payload.
 * 3. Reset prompt wait state.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {void}
 */
function clearState(state) {
  clearPendingTimeout(state);
  state.queuedPayload = null;
  resetPromptWaitState(state);
}

/**
 * Compute base remaining delay from prompt timing constraint.
 *
 * @pseudocode
 * 1. Calculate remaining delay via computeRemainingPromptDelayMs.
 * 2. Clamp to zero if not finite.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {number} Base remaining delay in milliseconds.
 */
function computeBaseRemaining(state) {
  const computed = Number(computeRemainingPromptDelayMs(state.config.now));
  return Number.isFinite(computed) ? Math.max(MIN_COUNTDOWN_VALUE, computed) : MIN_COUNTDOWN_VALUE;
}

/**
 * Compute remaining delay from prompt wait deadline.
 *
 * @pseudocode
 * 1. If deadline is not set, return 0.
 * 2. Otherwise, return max(0, deadline - now).
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {number} Remaining time until deadline, or 0.
 */
function computePromptWaitRemaining(state) {
  if (state.promptWaitDeadline <= MIN_COUNTDOWN_VALUE) return MIN_COUNTDOWN_VALUE;
  return Math.max(MIN_COUNTDOWN_VALUE, state.promptWaitDeadline - state.config.now());
}

/**
 * Compute total remaining prompt delay considering all constraints.
 *
 * @pseudocode
 * 1. Get base remaining delay from timing constraint.
 * 2. If non-zero, return it (timing constraint takes priority).
 * 3. Otherwise, if waiting for prompt and it's not active, get wait deadline remaining.
 * 4. Otherwise return 0.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {number} Total remaining delay in milliseconds.
 */
function getRemainingPromptDelayMsState(state) {
  const baseRemaining = computeBaseRemaining(state);
  if (baseRemaining > MIN_COUNTDOWN_VALUE) return baseRemaining;

  const canWaitForPrompt = state.config.maxPromptWait > MIN_COUNTDOWN_VALUE;
  if (!state.config.waitForPromptOption || !canWaitForPrompt || hasActivePrompt()) {
    return MIN_COUNTDOWN_VALUE;
  }

  return computePromptWaitRemaining(state);
}

/**
 * Check if countdown should defer based on prompt and timing constraints.
 *
 * @pseudocode
 * 1. If waiting for prompt and no active prompt, defer.
 * 2. If remaining prompt delay is positive, defer.
 * 3. Otherwise, don't defer.
 *
 * @param {object} state - Prompt delay controller state.
 * @returns {boolean} True if tick should be deferred.
 */
function shouldDeferState(state) {
  if (state.config.waitForPromptOption && !hasActivePrompt()) {
    return true;
  }
  return computeRemainingPromptDelayMs(state.config.now) > 0;
}

/**
 * Create a controller that defers countdown ticks until prompt constraints finish.
 *
 * @description Manages prompt delay logic by deferring countdown ticks while waiting for
 * opponent prompts to become active or minimum inter-prompt durations to elapse. Provides
 * a queueing interface for ticks and exposes utilities for clearing state and checking
 * whether deferral should occur.
 *
 * @pseudocode
 * 1. Normalize and validate timing options (poll intervals, max wait, timer functions).
 * 2. Create encapsulated state object holding config, pending timeouts, queue, and deadlines.
 * 3. Initialize controller interface exposing three public methods.
 * 4. Return controller with queueTick (defer until ready), clear (reset state), and shouldDefer
 *    (check if deferral active) methods.
 *
 * @param {{
 *   waitForOpponentPrompt?: boolean,
 *   promptPollIntervalMs?: number,
 *   maxPromptWaitMs?: number,
 *   setTimeoutFn?: typeof setTimeout,
 *   clearTimeoutFn?: typeof clearTimeout,
 *   now?: () => number
 * }} [options] - Timing configuration and function overrides.
 * @returns {{
 *   queueTick: (value: number, queueOptions: {suppressEvents?: boolean}, onReady: Function) => void,
 *   clear: () => void,
 *   shouldDefer: () => boolean,
 *   getRemainingPromptDelayMs: () => number
 * }} Prompt delay controller interface.
 */
export function createPromptDelayController(options = {}) {
  const config = normalizePromptDelayOptions(options);
  const state = createPromptDelayState(config);
  return createControllerInterface(state);
}

const createControllerInterface = (state) => ({
  queueTick: (value, queueOptions = {}, onReady) =>
    queueTickInternal(state, value, queueOptions, onReady),
  clear: () => clearState(state),
  shouldDefer: () => shouldDeferState(state),
  /**
   * Report the remaining milliseconds before queued ticks should execute.
   *
   * @returns {number}
   */
  getRemainingPromptDelayMs: () => getRemainingPromptDelayMsState(state)
});

/**
 * Create renderer state for countdown attachment.
 *
 * @pseudocode
 * 1. Initialize tracking variables for render state and timing.
 * 2. Create prompt delay controller with configuration.
 * 3. Check for pre-rendered countdown from Vitest environment (test-only).
 * 4. Return composed state object for use by renderer.
 *
 * @param {{
 *   waitForOpponentPrompt?: boolean,
 *   maxPromptWaitMs?: number,
 *   promptPollIntervalMs?: number,
 *   opponentPromptBufferMs?: number
 * }} [options] - Countdown delay configuration.
 * @returns {{
 *   started: boolean,
 *   lastRendered: number,
 *   rendered: boolean,
 *   promptController: object,
 *   waitForPromptOption: boolean,
 *   maxPromptWaitMs: number
 * }} Renderer state object.
 */
function createRendererState(options = {}) {
  const waitForPromptOption = options?.waitForOpponentPrompt === true;
  const maxPromptWaitMs = Number(options?.maxPromptWaitMs);
  const promptController = createPromptDelayController({
    waitForOpponentPrompt: waitForPromptOption,
    promptPollIntervalMs: options?.promptPollIntervalMs,
    maxPromptWaitMs: options?.maxPromptWaitMs
  });

  const initialCountdown = __TEST_ONLY_tryGetInitialRenderedCountdown();
  const started = false;
  const lastRendered = initialCountdown !== null ? initialCountdown : INVALID_COUNTDOWN_SENTINEL;
  const rendered = initialCountdown !== null;

  return {
    started,
    lastRendered,
    rendered,
    promptController,
    waitForPromptOption,
    maxPromptWaitMs
  };
}

/**
 * Create helper functions for rendering and tick processing.
 *
 * @pseudocode
 * 1. Create normalizer for countdown values (clamp to positive).
 * 2. Create render function for snackbar and scoreboard updates.
 * 3. Create tick processor for state machine and event emission.
 * 4. Create prompt remaining getter from controller.
 * 5. Create tick queuing handler with prompt delay logic.
 * 6. Return object of all helper functions.
 *
 * @param {object} rendererState - Renderer state from createRendererState.
 * @returns {{
 *   normalizeRemaining: (value: number) => number,
 *   render: (remaining: number) => number,
 *   processTick: (normalized: number, options?: {suppressEvents?: boolean}) => void,
 *   getRemainingPromptDelayMs: () => number,
 *   processTickWithPromptDelay: (value: number, queueOptions?: object, renderOptions?: object) => void
 * }} Helper functions for tick processing.
 */
function createTickProcessors(rendererState) {
  const normalizeRemaining = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return MIN_COUNTDOWN_VALUE;
    return Math.max(MIN_COUNTDOWN_VALUE, numeric);
  };

  const render = (remaining) => {
    const clamped = normalizeRemaining(remaining);
    const text = t("ui.nextRoundIn", { seconds: clamped });
    const shouldSuppressSnackbar = isSelectionOrDecisionPhase() || isOpponentPromptWindowActive();
    const isNewValue = clamped !== rendererState.lastRendered;

    if (!shouldSuppressSnackbar) {
      if (!rendererState.rendered) {
        snackbar.showSnackbar(text);
        rendererState.rendered = true;
      } else if (isNewValue) {
        snackbar.updateSnackbar(text);
      }
    }

    rendererState.lastRendered = clamped;
    try {
      if (typeof scoreboard.updateTimer === "function") {
        scoreboard.updateTimer(clamped);
      }
    } catch {}
    return clamped;
  };

  const processTick = (normalized, { suppressEvents = false } = {}) => {
    if (
      !rendererState.started &&
      rendererState.rendered &&
      rendererState.lastRendered >= 0 &&
      normalized === rendererState.lastRendered
    ) {
      if (!suppressEvents) {
        rendererState.started = true;
        emitBattleEvent("nextRoundCountdownStarted");
        emitBattleEvent("nextRoundCountdownTick", { remaining: normalized });
      }
      return;
    }
    const clamped = render(normalized);
    if (!rendererState.started && !suppressEvents) {
      rendererState.started = true;
      emitBattleEvent("nextRoundCountdownStarted");
    }
    if (!suppressEvents) {
      emitBattleEvent("nextRoundCountdownTick", { remaining: clamped });
    }
  };

  const deliverTick = (value, { suppressEvents }) => {
    processTick(value, { suppressEvents });
  };

  const getRemainingPromptDelayMs = () => {
    try {
      if (typeof rendererState.promptController.getRemainingPromptDelayMs === "function") {
        const remaining = Number(rendererState.promptController.getRemainingPromptDelayMs());
        if (Number.isFinite(remaining)) {
          return remaining;
        }
      }
    } catch {}
    return MIN_COUNTDOWN_VALUE;
  };

  const processTickWithPromptDelay = (value, queueOptions = {}, { respectDelay = false } = {}) => {
    const normalized = normalizeRemaining(value);
    const suppressEvents = queueOptions?.suppressEvents === true;
    const normalizedOptions = { suppressEvents };

    // Guard: First render with prompt wait enabled
    const isFirstRender = !rendererState.rendered;
    const canWaitForPrompt =
      !rendererState.started &&
      rendererState.waitForPromptOption &&
      Number.isFinite(rendererState.maxPromptWaitMs) &&
      rendererState.maxPromptWaitMs > MIN_COUNTDOWN_VALUE;
    const waitingForPrompt = canWaitForPrompt && !hasActivePrompt();

    if (isFirstRender && waitingForPrompt) {
      rendererState.promptController.queueTick(normalized, normalizedOptions, deliverTick);
      return;
    }

    // Guard: First render without wait - process immediately
    if (isFirstRender) {
      rendererState.promptController.clear();
      processTick(normalized, normalizedOptions);
      return;
    }

    // Subsequent renders follow prompt delay logic
    const remainingRaw = Number(getRemainingPromptDelayMs());
    const remainingDelay = Number.isFinite(remainingRaw)
      ? Math.max(MIN_COUNTDOWN_VALUE, remainingRaw)
      : MIN_COUNTDOWN_VALUE;
    const shouldQueue =
      !rendererState.started && (waitingForPrompt || remainingDelay > MIN_COUNTDOWN_VALUE);

    if (!shouldQueue && !respectDelay) {
      rendererState.promptController.clear();
      processTick(normalized, normalizedOptions);
      return;
    }

    if (!waitingForPrompt && remainingDelay <= MIN_COUNTDOWN_VALUE) {
      rendererState.promptController.clear();
      processTick(normalized, normalizedOptions);
      return;
    }

    rendererState.promptController.queueTick(normalized, normalizedOptions, deliverTick);
  };

  return {
    normalizeRemaining,
    render,
    processTick,
    getRemainingPromptDelayMs,
    processTickWithPromptDelay
  };
}

/**
 * Setup timer event handlers and initial rendering.
 *
 * @pseudocode
 * 1. Create tick processor helper functions.
 * 2. Define onTick and onExpired handlers that dispatch to processor.
 * 3. Subscribe onTick and onExpired to timer events.
 * 4. If initialRemaining provided, process it through tick pipeline.
 * 5. Return handler references and processor for cleanup.
 *
 * @param {{on: Function, off: Function}} timer - Timer with event subscription API.
 * @param {number} [initialRemaining] - Seconds remaining to render initially.
 * @param {object} rendererState - Renderer state.
 * @returns {{
 *   onTick: Function,
 *   onExpired: Function,
 *   processTickWithPromptDelay: Function,
 *   promptController: object
 * }} Handler references and state for cleanup.
 */
function setupTickHandlers(timer, initialRemaining, rendererState) {
  const processors = createTickProcessors(rendererState);

  const onTick = (remaining) => {
    processors.processTickWithPromptDelay(remaining);
  };

  const onExpired = () => onTick(0);

  timer.on("tick", onTick);
  timer.on("expired", onExpired);

  const initialValue = Number(initialRemaining);
  if (Number.isFinite(initialValue)) {
    try {
      processors.processTickWithPromptDelay(
        initialValue,
        { suppressEvents: true },
        {
          respectDelay: true
        }
      );
    } catch {}
  }

  return {
    onTick,
    onExpired,
    promptController: rendererState.promptController,
    timer
  };
}

/**
 * @internal
 * @vitest-only
 * Extract pre-rendered countdown from DOM for test state restoration.
 * This function MUST only be called in Vitest test environments.
 *
 * @pseudocode
 * 1. Only in Vitest environment with document available.
 * 2. Query for existing snackbar element.
 * 3. Extract countdown seconds from text if present.
 * 4. Return extracted value or null.
 *
 * @returns {number|null} Initial countdown value if found, null otherwise.
 */
function __TEST_ONLY_tryGetInitialRenderedCountdown() {
  if (!isVitestEnvironment() || typeof document === "undefined") {
    return null;
  }
  try {
    const existing = document.querySelector?.(".snackbar");
    const m = existing?.textContent?.match?.(/Next round in: (\d+)s/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Attach snackbar + scoreboard rendering to a timer.
 *
 * @description Subscribes to timer tick/expired events and renders countdown UI via snackbar
 * and scoreboard updates. Respects opponent prompt timing constraints by deferring ticks until
 * prompts become active or minimum delays elapse. Emits battle events on each tick for
 * test coordination. Returns a detach function to clean up listeners and state.
 *
 * @pseudocode
 * 1. Initialize renderer state: last rendered value, started flag, prompt controller.
 * 2. Setup timer event handlers for tick and expiration callbacks.
 * 3. Subscribe to timer events and perform initial rendering if provided.
 * 4. Return detach function that unsubscribes, clears controller state, and tears down listeners.
 *
 * @param {{on: Function, off: Function}} timer - Timer with event subscription API.
 * @param {number} [initialRemaining] - Seconds remaining to render initially (optional).
 * @param {{
 *   waitForOpponentPrompt?: boolean,
 *   maxPromptWaitMs?: number,
 *   promptPollIntervalMs?: number,
 *   opponentPromptBufferMs?: number
 * }} [options] - Optional countdown delay configuration.
 * @returns {() => void} Detach function to clean up listeners and state.
 */
export function attachCooldownRenderer(timer, initialRemaining, options = {}) {
  const rendererState = createRendererState(options);
  const handlers = setupTickHandlers(timer, initialRemaining, rendererState);

  return () => {
    timer.off("tick", handlers.onTick);
    timer.off("expired", handlers.onExpired);
    handlers.promptController.clear();
  };
}
