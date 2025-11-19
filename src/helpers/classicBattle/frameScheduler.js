/**
 * Frame scheduling utilities for post-round UI state management.
 *
 * Provides deterministic frame-based scheduling with fallback timeout support
 * for environments where requestAnimationFrame may not be available.
 *
 * @module frameScheduler
 */

/**
 * Create a fallback timer for cases where frame-based scheduling fails.
 *
 * @pseudocode
 * 1. Use setTimeout with specified duration.
 * 2. Provide cancel method to clean up timeout.
 * 3. Track scheduled state for safety checks.
 *
 * @param {() => void} onTimeout - Callback when timer expires
 * @param {number} [timeoutMs=32] - Timeout duration in milliseconds
 * @returns {{
 *   cancel: () => void,
 *   isScheduled: () => boolean
 * }}
 */
function createFallbackTimer(onTimeout, timeoutMs = 32) {
  if (typeof setTimeout !== "function") {
    return {
      cancel: () => {},
      isScheduled: () => false
    };
  }

  let id = setTimeout(() => {
    id = null;
    onTimeout();
  }, timeoutMs);

  return {
    cancel: () => {
      if (id === null) return;
      if (typeof clearTimeout === "function") {
        try {
          clearTimeout(id);
        } catch {
          // Ignore cleanup failures but continue resetting the ID
        } finally {
          id = null;
        }
        return;
      }
      id = null;
    },
    isScheduled: () => id !== null
  };
}

/**
 * Track pending animation frame completions.
 *
 * @pseudocode
 * 1. Increment counter when frame begins.
 * 2. Decrement on completion.
 * 3. Invoke callback when all frames complete.
 *
 * @param {() => void} onIdle - Callback when all frames complete
 * @returns {{
 *   beginFrame: () => void,
 *   completeFrame: () => void
 * }}
 */
function createPendingFrameState(onIdle) {
  let pending = 0;

  const completeFrame = () => {
    pending = Math.max(0, pending - 1);
    if (pending === 0) onIdle();
  };

  return {
    beginFrame: () => {
      pending += 1;
    },
    completeFrame
  };
}

/**
 * Validate frame ID format.
 *
 * @param {any} id - Value to check
 * @returns {boolean}
 */
function isFrameIdValid(id) {
  return typeof id === "number" && id > 0;
}

/**
 * Create RAF (requestAnimationFrame) scheduling support with cleanup.
 *
 * @pseudocode
 * 1. Validate raf and cancelRaf functions.
 * 2. Schedule callbacks via RAF with tracking.
 * 3. Provide cancel method for cleanup.
 * 4. Call onComplete callback after each frame.
 *
 * @param {(callback: () => void) => number} raf - requestAnimationFrame
 * @param {(id: number) => void} cancelRaf - cancelAnimationFrame
 * @param {() => void} onComplete - Callback after frame completes
 * @returns {{
 *   schedule: ((cb: () => void) => number) | null,
 *   cancel: (id: number) => boolean,
 *   rafAvailable: boolean
 * }}
 */
function createRafSupport(raf, cancelRaf, onComplete) {
  if (typeof raf !== "function") {
    return {
      schedule: null,
      cancel: () => false,
      rafAvailable: false
    };
  }

  const frameIds = new Set();

  const schedule = (cb) => {
    let frameId;
    frameId = raf(() => {
      try {
        cb();
      } finally {
        if (isFrameIdValid(frameId)) frameIds.delete(frameId);
        onComplete();
      }
    });

    if (isFrameIdValid(frameId)) {
      frameIds.add(frameId);
      return frameId;
    }
    return 0;
  };

  const cancel = (id) => {
    if (typeof cancelRaf !== "function") return false;
    if (!isFrameIdValid(id) || !frameIds.has(id)) return false;

    frameIds.delete(id);
    try {
      cancelRaf(id);
    } catch {
      // Ignore cancel failures but still treat the frame as completed
    } finally {
      onComplete();
    }
    return true;
  };

  return {
    schedule,
    cancel,
    rafAvailable: true
  };
}

/**
 * Run a callback immediately and call completion handler.
 *
 * @param {() => void} cb - Callback to run
 * @param {() => void} onComplete - Completion callback
 * @returns {number} Always returns 0 for sync execution
 */
function runFrameImmediately(cb, onComplete) {
  try {
    cb();
  } finally {
    onComplete();
  }
  return 0;
}

/**
 * Create a frame tracker that manages scheduling with fallback support.
 *
 * @pseudocode
 * 1. Track pending frames with ref-counting.
 * 2. Use RAF when available, fallback to immediate execution.
 * 3. Cancel RAF frames on demand.
 * 4. Call onIdle when all scheduled work completes.
 *
 * @param {(callback: () => void) => number} raf - requestAnimationFrame
 * @param {(id: number) => void} cancelRaf - cancelAnimationFrame
 * @param {() => void} onIdle - Callback when all frames complete
 * @returns {{
 *   schedule: (cb: () => void) => number,
 *   cancel: (id: number) => void,
 *   rafAvailable: boolean
 * }}
 */
function createFrameTracker(raf, cancelRaf, onIdle) {
  const state = createPendingFrameState(onIdle);
  const rafSupport = createRafSupport(raf, cancelRaf, state.completeFrame);

  const schedule = (cb) => {
    if (typeof cb !== "function") return 0;

    state.beginFrame();
    try {
      if (rafSupport.rafAvailable && rafSupport.schedule) {
        return rafSupport.schedule(cb);
      }
      return runFrameImmediately(cb, state.completeFrame);
    } catch (error) {
      state.completeFrame();
      throw error;
    }
  };

  const cancel = (id) => {
    if (!rafSupport.rafAvailable) return;
    rafSupport.cancel(id);
  };

  return {
    schedule,
    cancel,
    rafAvailable: rafSupport.rafAvailable
  };
}

/**
 * Create a scheduler for post-round UI state re-locking.
 *
 * Manages frame-based scheduling with fallback timeout support to ensure
 * UI state is properly locked after round resolution, even in degraded
 * environments.
 *
 * @pseudocode
 * 1. Create fallback timer for environments without RAF.
 * 2. Create frame tracker with RAF if available.
 * 3. Coordinate timeout and frame completion.
 * 4. Ensure safety lock when no timing APIs succeed.
 *
 * @param {() => void} lockFn - Function to call to lock state
 * @returns {{
 *   scheduler: { onFrame: (cb: () => void) => number, cancel: (id: number) => void },
 *   handleFailure: () => void,
 *   ensureSafetyLock: () => void,
 *   markLocked: () => void
 * }}
 */
export function createPostResetScheduler(lockFn) {
  let postResetLocked = false;

  const globalTarget = typeof globalThis === "object" && globalThis ? globalThis : {};
  const rafCandidate = globalTarget.requestAnimationFrame;
  const cancelRafCandidate = globalTarget.cancelAnimationFrame;

  const raf = typeof rafCandidate === "function" ? rafCandidate.bind(globalTarget) : null;
  const cancelRaf =
    typeof cancelRafCandidate === "function" ? cancelRafCandidate.bind(globalTarget) : null;

  const runPostResetLock = () => {
    if (postResetLocked) return;
    postResetLocked = true;
    lockFn();
  };

  const fallbackTimer = createFallbackTimer(runPostResetLock);
  const frameTracker = createFrameTracker(raf, cancelRaf, () => {
    fallbackTimer.cancel();
    runPostResetLock();
  });

  return {
    scheduler: {
      onFrame: (cb) => frameTracker.schedule(cb),
      cancel: (id) => frameTracker.cancel(id)
    },
    handleFailure: () => {
      fallbackTimer.cancel();
      runPostResetLock();
    },
    ensureSafetyLock: () => {
      if (!postResetLocked && !fallbackTimer.isScheduled() && !frameTracker.rafAvailable) {
        // Final safety: ensure buttons stay locked when no timing APIs succeed.
        runPostResetLock();
      }
    },
    markLocked: () => {
      postResetLocked = true;
    }
  };
}
