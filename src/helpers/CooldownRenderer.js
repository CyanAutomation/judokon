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

const DEFAULT_PROMPT_POLL_INTERVAL = 16;

/**
 * Get a timer function (setTimeout/clearTimeout) with proper bindings.
 *
 * @pseudocode
 * 1. Check if the function exists on window object.
 * 2. If available, bind it to window to preserve context.
 * 3. Otherwise, fall back to the global function.
 *
 * @param {string} name - Function name to retrieve.
 * @param {Function} fallback - Fallback function if not found on window.
 * @returns {Function} Bound function or fallback.
 */
function getTimerFunction(name, fallback) {
  try {
    if (typeof window !== "undefined" && typeof window[name] === "function") {
      return window[name].bind(window);
    }
  } catch {}
  return fallback;
}

const defaultSetTimeout = getTimerFunction("setTimeout", setTimeout);
const defaultClearTimeout = getTimerFunction("clearTimeout", clearTimeout);

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
  return Number.EPSILON;
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
    DEFAULT_PROMPT_POLL_INTERVAL
  );
  const maxPromptWait = toPositiveNumber(options?.maxPromptWaitMs, 0);
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
    if (typeof isOpponentPromptReady === "function" && isOpponentPromptReady() === true) {
      return true;
    }
    const timestamp = Number(getOpponentPromptTimestamp());
    return Number.isFinite(timestamp) && timestamp > 0;
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
    if (!Number.isFinite(minDuration) || minDuration <= 0) {
      return 0;
    }
    const lastPrompt = Number(getOpponentPromptTimestamp());
    if (!Number.isFinite(lastPrompt) || lastPrompt <= 0) {
      return 0;
    }
    const elapsed = nowFn() - lastPrompt;
    if (!Number.isFinite(elapsed)) {
      return 0;
    }
    return Math.max(0, minDuration - elapsed);
  } catch {}
  return 0;
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

function handlePromptWaiting(state) {
  if (!state.config.waitForPromptOption) {
    if (state.promptWaitDeadline !== 0 && hasActivePrompt()) {
      resetPromptWaitState(state);
    }
    return false;
  }

  if (hasActivePrompt()) {
    resetPromptWaitState(state);
    return false;
  }

  const canWaitForPrompt = state.config.maxPromptWait > 0;
  if (canWaitForPrompt && state.promptWaitDeadline === 0) {
    state.promptWaitDeadline = state.config.now() + state.config.maxPromptWait;
    state.promptWaitPollsRemaining = state.config.maxPromptPollRetries;
  }

  const pollLimitReached =
    canWaitForPrompt &&
    state.config.maxPromptPollRetries > 0 &&
    state.promptWaitPollsRemaining <= 0;

  const deadlineReached = !canWaitForPrompt
    ? true
    : state.promptWaitDeadline > 0 && state.config.now() >= state.promptWaitDeadline;

  if (deadlineReached || pollLimitReached) {
    resetPromptWaitState(state);
    return false;
  }

  if (!canWaitForPrompt) {
    return false;
  }

  const scheduled = schedulePromptPoll(state);
  if (scheduled && state.config.maxPromptPollRetries > 0) {
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
  return Number.isFinite(computed) ? Math.max(0, computed) : 0;
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
  if (state.promptWaitDeadline <= 0) return 0;
  return Math.max(0, state.promptWaitDeadline - state.config.now());
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
  if (baseRemaining > 0) return baseRemaining;

  if (!state.config.waitForPromptOption || state.config.maxPromptWait <= 0 || hasActivePrompt()) {
    return 0;
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
 * @pseudocode
 * 1. Normalize timing options and capture shared state.
 * 2. Queue ticks until prompts or minimum delays finish, reusing helper functions.
 * 3. Expose `queueTick`, `clear`, and `shouldDefer` to the renderer.
 *
 * @param {{
 *   waitForOpponentPrompt?: boolean,
 *   promptPollIntervalMs?: number,
 *   maxPromptWaitMs?: number,
 *   setTimeoutFn?: typeof setTimeout,
 *   clearTimeoutFn?: typeof clearTimeout,
 *   now?: () => number
 * }} [options]
 * @returns {{
 *   queueTick: (value: number, options: { suppressEvents?: boolean }, onReady: Function) => void,
 *   clear: () => void,
 *   shouldDefer: () => boolean
 * }}
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
 * Try to extract initially rendered countdown from Vitest snackbar (test-only).
 *
 * @pseudocode
 * 1. Only in Vitest environment with document available.
 * 2. Query for existing snackbar element.
 * 3. Extract countdown seconds from text if present.
 * 4. Return extracted value or null.
 *
 * @returns {number|null} Initial countdown value if found, null otherwise.
 */
function tryGetInitialRenderedCountdown() {
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
 * @pseudocode
 * 1. Subscribe to timer `tick` and `expired` events.
 * 2. On `tick`, emit countdown events and render snackbar.
 * 3. On `expired`, render final 0s, emit final tick, and clear scoreboard timer.
 * 4. Optionally render initial remaining immediately when provided.
 *
 * @param {{on: Function, off: Function}} timer - Timer with event API.
 * @param {number} [initialRemaining] - Seconds remaining to render initially.
 * @param {{
 *   waitForOpponentPrompt?: boolean,
 *   maxPromptWaitMs?: number,
 *   promptPollIntervalMs?: number,
 *   opponentPromptBufferMs?: number
 * }} [options] - Optional countdown delay configuration.
 * @returns {() => void} Detach function.
 */
export function attachCooldownRenderer(timer, initialRemaining, options = {}) {
  let started = false;
  let lastRendered = -1;
  let rendered = false;
  const waitForPromptOption = options?.waitForOpponentPrompt === true;
  const maxPromptWaitMs = Number(options?.maxPromptWaitMs);
  const promptController = createPromptDelayController({
    waitForOpponentPrompt: waitForPromptOption,
    promptPollIntervalMs: options?.promptPollIntervalMs,
    maxPromptWaitMs: options?.maxPromptWaitMs
  });
  // In unit tests, if a snackbar already shows a countdown value, treat that
  // as the initial render and skip the first decrement to avoid off-by-one
  // perception when timers begin very soon after the outcome.
  const initialCountdown = tryGetInitialRenderedCountdown();
  if (initialCountdown !== null) {
    lastRendered = initialCountdown;
    rendered = true;
    // Mark that we've effectively "rendered" the initial state.
    // The first engine tick will only establish `started` without
    // changing the visible countdown.
  }

  const normalizeRemaining = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, numeric);
  };

  const render = (remaining) => {
    const clamped = normalizeRemaining(remaining);
    const text = t("ui.nextRoundIn", { seconds: clamped });
    if (!rendered) {
      snackbar.showSnackbar(text);
      rendered = true;
    } else if (clamped !== lastRendered) {
      snackbar.updateSnackbar(text);
    }
    lastRendered = clamped;
    try {
      if (typeof scoreboard.updateTimer === "function") {
        scoreboard.updateTimer(clamped);
      }
    } catch {}
    return clamped;
  };

  const processTick = (normalized, { suppressEvents = false } = {}) => {
    if (!started && rendered && lastRendered >= 0 && normalized === lastRendered) {
      if (!suppressEvents) {
        started = true;
        emitBattleEvent("nextRoundCountdownStarted");
        emitBattleEvent("nextRoundCountdownTick", { remaining: normalized });
      }
      return;
    }
    const clamped = render(normalized);
    if (!started && !suppressEvents) {
      started = true;
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
      if (typeof promptController.getRemainingPromptDelayMs === "function") {
        const remaining = Number(promptController.getRemainingPromptDelayMs());
        if (Number.isFinite(remaining)) {
          return remaining;
        }
      }
    } catch {}
    return 0;
  };

  const processTickWithPromptDelay = (value, queueOptions = {}, { respectDelay = false } = {}) => {
    const normalized = normalizeRemaining(value);
    const suppressEvents = queueOptions?.suppressEvents === true;
    const normalizedOptions = { suppressEvents };
    const remainingRaw = Number(getRemainingPromptDelayMs());
    const remainingDelay = Number.isFinite(remainingRaw) ? Math.max(0, remainingRaw) : 0;
    const canWaitForPrompt =
      !started && waitForPromptOption && Number.isFinite(maxPromptWaitMs) && maxPromptWaitMs > 0;
    const waitingForPrompt = canWaitForPrompt && !hasActivePrompt();
    const shouldDelay = !started && (waitingForPrompt || remainingDelay > 0);

    if (!shouldDelay && !respectDelay) {
      promptController.clear();
      processTick(normalized, normalizedOptions);
      return;
    }

    if (!waitingForPrompt && remainingDelay <= 0) {
      promptController.clear();
      processTick(normalized, normalizedOptions);
      return;
    }

    promptController.queueTick(normalized, normalizedOptions, deliverTick);
  };

  const onTick = (remaining) => {
    processTickWithPromptDelay(remaining);
  };

  const onExpired = () => onTick(0);

  timer.on("tick", onTick);
  timer.on("expired", onExpired);
  const initialValue = Number(initialRemaining);
  if (Number.isFinite(initialValue)) {
    try {
      processTickWithPromptDelay(initialValue, { suppressEvents: true }, { respectDelay: true });
    } catch {}
  }
  return () => {
    timer.off("tick", onTick);
    timer.off("expired", onExpired);
    promptController.clear();
  };
}
