import { onBattleEvent } from "./battleEvents.js";

/**
 * Classic Battle ready suppression duration in milliseconds.
 *
 * @summary Resolve the suppression window override from `window` when available.
 * @pseudocode
 * 1. Default to 200ms when running outside the browser.
 * 2. Read `window.__READY_SUPPRESSION_WINDOW_MS` when possible.
 * 3. Return the override when it is a number, otherwise fall back to 200.
 * @type {number}
*/
const READY_SUPPRESSION_WINDOW_MS = (() => {
  if (typeof window === "undefined") {
    return 200;
  }
  try {
    const override = window.__READY_SUPPRESSION_WINDOW_MS;
    return typeof override === "number" ? override : 200;
  } catch {
    return 200;
  }
})();

let lastManualRoundStartTimestamp = 0;
if (typeof window !== "undefined") {
  try {
    const existing = Number(window.__lastManualRoundStartTimestamp);
    if (Number.isFinite(existing)) {
      lastManualRoundStartTimestamp = existing;
    }
  } catch {}
}
let initialized = false;

function getCurrentTimestamp() {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function sanitizeDetailValue(value) {
  if (value === null || value === undefined) return null;
  const valueType = typeof value;
  return valueType === "string" || valueType === "number" || valueType === "boolean"
    ? value
    : null;
}

function snapshotDetail(detail) {
  if (!detail || typeof detail !== "object") {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries({
      source: sanitizeDetailValue(detail?.source),
      via: sanitizeDetailValue(detail?.via)
    }).filter(([, value]) => value !== undefined)
  );
}

function appendHistoryEntry(entry, info, detail) {
  if (info && typeof info === "object") {
    for (const [key, value] of Object.entries(info)) {
      if (key === "type" || key === "timestamp") continue;
      entry[key] = value;
    }
  }
  const detailSnapshot = snapshotDetail(detail);
  if (detailSnapshot) {
    entry.payload = detailSnapshot;
  }
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!Array.isArray(window.__roundCycleHistory)) {
      window.__roundCycleHistory = [];
    }
    window.__roundCycleHistory.push(entry);
  } catch (error) {
    try {
      if (typeof console !== "undefined") {
        const logger =
          typeof console.warn === "function"
            ? console.warn
            : typeof console.error === "function"
              ? console.error
              : typeof console.log === "function"
                ? console.log
                : null;
        if (logger) {
          logger.call(console, "battleClassic: failed to push to window.__roundCycleHistory", {
            type: entry.type,
            info,
            payload: entry.payload,
            error
          });
        }
      }
    } catch {}
  }
}

function handleRoundStart(event) {
  const detail = event && typeof event === "object" ? event.detail : undefined;
  const manualRoundStart =
    detail && typeof detail === "object" && detail?.source === "next-button";
  const timestamp = getCurrentTimestamp();
  if (manualRoundStart) {
    lastManualRoundStartTimestamp = timestamp;
    if (typeof window !== "undefined") {
      try {
        window.__lastManualRoundStartTimestamp = lastManualRoundStartTimestamp;
      } catch {}
    }
  }
  const entry = {
    type: "round.start",
    timestamp
  };
  appendHistoryEntry(entry, { manualRoundStart: Boolean(manualRoundStart) }, detail);
}

function handleReady(event) {
  const detail = event && typeof event === "object" ? event.detail : undefined;
  const now = getCurrentTimestamp();
  const hasManualStamp = lastManualRoundStartTimestamp > 0;
  const elapsedSinceManual = hasManualStamp
    ? now - lastManualRoundStartTimestamp
    : Number.POSITIVE_INFINITY;
  const skipDueToManual =
    hasManualStamp && elapsedSinceManual >= 0 && elapsedSinceManual < READY_SUPPRESSION_WINDOW_MS;
  const info = {
    skipped: skipDueToManual,
    suppressionWindowMs: READY_SUPPRESSION_WINDOW_MS
  };
  if (hasManualStamp && Number.isFinite(elapsedSinceManual)) {
    info.sinceManualStartMs = elapsedSinceManual;
  }
  const entry = {
    type: "ready",
    timestamp: now
  };
  appendHistoryEntry(entry, info, detail);
}

/**
 * Register round cycle history tracking listeners.
 *
 * @summary Wire `round.start` and `ready` events to push history entries.
 * @pseudocode
 * 1. Ensure the tracker initializes only once.
 * 2. Listen for `round.start` to capture manual invocations and log history.
 * 3. Listen for `ready` to record suppression metadata and log history.
 *
 * @returns {void}
 */
export function initRoundCycleHistoryTracker() {
  if (initialized) {
    return;
  }
  initialized = true;
  onBattleEvent("round.start", handleRoundStart);
  onBattleEvent("ready", handleReady);
}

initRoundCycleHistoryTracker();
