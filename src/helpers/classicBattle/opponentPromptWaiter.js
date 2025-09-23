import { onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { getOpponentDelay } from "./snackbar.js";
import {
  getOpponentPromptTimestamp,
  getOpponentPromptMinDuration
} from "./opponentPromptTracker.js";
import { createPollingThrottle } from "./pollingThrottle.js";

function safeNow() {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch {}
  try {
    return Date.now();
  } catch {}
  return 0;
}

const PROMPT_READY_EVENT = "opponentPromptReady";

function resolvePromptReadyRegistrar(eventName, options = {}) {
  if (options && typeof options.onEvent === "function" && typeof options.offEvent === "function") {
    return (handler) => {
      options.onEvent(eventName, handler);
      return () => {
        try {
          options.offEvent(eventName, handler);
        } catch {}
      };
    };
  }
  const target = options?.eventTarget;
  if (
    target &&
    typeof target.addEventListener === "function" &&
    typeof target.removeEventListener === "function"
  ) {
    return (handler) => {
      try {
        target.addEventListener(eventName, handler);
      } catch {}
      return () => {
        try {
          target.removeEventListener(eventName, handler);
        } catch {}
      };
    };
  }
  if (typeof onBattleEvent === "function" && typeof offBattleEvent === "function") {
    return (handler) => {
      onBattleEvent(eventName, handler);
      return () => {
        try {
          offBattleEvent(eventName, handler);
        } catch {}
      };
    };
  }
  return null;
}

function createPromptReadySubscription(options = {}) {
  if (options.usePromptEvent === false) return null;
  const eventName =
    typeof options.promptReadyEvent === "string" && options.promptReadyEvent
      ? options.promptReadyEvent
      : PROMPT_READY_EVENT;
  if (!eventName) {
    return null;
  }
  const register = resolvePromptReadyRegistrar(eventName, options);
  if (!register) {
    return null;
  }
  let resolved = false;
  let cleanup = () => {};
  const promise = new Promise((resolve) => {
    const handler = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve();
    };
    try {
      cleanup = register(handler) || cleanup;
    } catch {
      cleanup = () => {};
      resolved = true;
      resolve();
    }
  });
  return {
    promise,
    cleanup: () => {
      cleanup();
    },
    isResolved: () => resolved
  };
}

async function resolveWaitResult(waitPromise, subscription) {
  if (subscription?.promise) {
    const outcome = await Promise.race([
      subscription.promise.then(() => ({ type: "event" })),
      waitPromise.then((timerUsed) => ({ type: "timer", timerUsed }))
    ]);
    if (outcome.type === "event") {
      return { event: true, usedTimer: true };
    }
    return { event: false, usedTimer: outcome.timerUsed };
  }
  const usedTimer = await waitPromise;
  return { event: false, usedTimer };
}

async function runPromptWaitLoop(deadline, throttle, subscription) {
  while (safeNow() < deadline) {
    if (hasPromptTimestamp()) {
      return;
    }
    const now = safeNow();
    const remaining = deadline - now;
    if (remaining <= 0) {
      break;
    }
    const delay = Math.min(throttle.intervalMs, remaining);
    const waitPromise = throttle.wait(delay);
    const result = await resolveWaitResult(waitPromise, subscription);
    if (result.event) {
      return;
    }
    if (hasPromptTimestamp()) {
      return;
    }
    if (!result.usedTimer) {
      break;
    }
  }
}

/**
 * Extra guard time to ensure the opponent prompt renders before cooldown ticks.
 *
 * @summary Safety buffer to keep opponent prompt and cooldown visuals aligned.
 * @pseudocode DEFAULT_OPPONENT_PROMPT_BUFFER_MS = 250
 * @type {number}
 * @constant
 */
export const DEFAULT_OPPONENT_PROMPT_BUFFER_MS = 250;

/**
 * Compute the total time we should wait for the opponent prompt to appear.
 *
 * @pseudocode
 * 1. Normalize `bufferOverride` to a non-negative finite number or fall back to the default buffer.
 * 2. Read the configured opponent delay and minimum prompt duration; coerce to non-negative numbers.
 * 3. Sum delay, minimum duration, and buffer to produce `totalMs`.
 * 4. Return an object describing the derived budget segments.
 *
 * @param {number} [bufferOverride=DEFAULT_OPPONENT_PROMPT_BUFFER_MS]
 * @returns {{ delayMs: number, minVisibleMs: number, bufferMs: number, totalMs: number }}
 */
export function computeOpponentPromptWaitBudget(
  bufferOverride = DEFAULT_OPPONENT_PROMPT_BUFFER_MS
) {
  const numeric = Number(bufferOverride);
  const normalizedBuffer =
    Number.isFinite(numeric) && numeric >= 0 ? numeric : DEFAULT_OPPONENT_PROMPT_BUFFER_MS;
  let delayMs = 0;
  let minVisibleMs = 0;
  try {
    const configuredDelay = Number(getOpponentDelay());
    if (Number.isFinite(configuredDelay) && configuredDelay > 0) {
      delayMs = configuredDelay;
    }
  } catch {}
  try {
    const configuredMin = Number(getOpponentPromptMinDuration());
    if (Number.isFinite(configuredMin) && configuredMin > 0) {
      minVisibleMs = configuredMin;
    }
  } catch {}
  const totalMs = Math.max(0, delayMs + minVisibleMs + normalizedBuffer);
  return { delayMs, minVisibleMs, bufferMs: normalizedBuffer, totalMs };
}

function hasPromptTimestamp() {
  try {
    const timestamp = Number(getOpponentPromptTimestamp());
    return Number.isFinite(timestamp) && timestamp > 0;
  } catch {
    return false;
  }
}

/**
 * Wait until the opponent prompt timestamp is recorded or the provided budget expires.
 *
 * @pseudocode
 * 1. Resolve the total wait budget; exit early when invalid or timestamp already recorded.
 * 2. Subscribe to the `opponentPromptReady` event when possible.
 * 3. Create a throttled polling helper using the requested interval (default ≥50ms).
 * 4. Loop until the elapsed time exceeds the budget:
 *    a. Await the earliest of the prompt-ready event or the throttled delay.
 *    b. After each wait, exit immediately if the timestamp is available.
 *    c. If timers are unavailable (`wait` resolves `false`), break to avoid busy loops.
 * 5. Return once the timestamp is detected, the prompt-ready event fires, or the time budget is exhausted.
 *
 * @param {{ totalMs: number }} [budget]
 * @param {{
 *   intervalMs?: number,
 *   scheduler?: { setTimeout?: Function },
 *   promptReadyEvent?: string,
 *   eventTarget?: EventTarget,
 *   onEvent?: (eventName: string, handler: (event: any) => void) => void,
 *   offEvent?: (eventName: string, handler: (event: any) => void) => void,
 *   usePromptEvent?: boolean
 * }} [options]
 * @returns {Promise<void>}
 */
export async function waitForDelayedOpponentPromptDisplay(
  budget = computeOpponentPromptWaitBudget(),
  options = {}
) {
  const totalMs = Number(budget?.totalMs);
  if (!Number.isFinite(totalMs) || totalMs <= 0) {
    return;
  }
  if (hasPromptTimestamp()) {
    return;
  }
  const throttle = createPollingThrottle({
    intervalMs: options.intervalMs,
    scheduler: options.scheduler
  });
  const subscription = createPromptReadySubscription(options);
  if (subscription?.isResolved?.()) {
    return;
  }
  const deadline = safeNow() + totalMs;
  try {
    await runPromptWaitLoop(deadline, throttle, subscription);
  } finally {
    subscription?.cleanup?.();
  }
}
