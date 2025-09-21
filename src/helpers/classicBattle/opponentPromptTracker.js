const DEFAULT_MIN_PROMPT_DURATION_MS = 600;

let lastPromptTimestamp = 0;

function now() {
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

export function recordOpponentPromptTimestamp(timestamp = now()) {
  const value = Number(timestamp);
  if (Number.isFinite(value) && value >= 0) {
    lastPromptTimestamp = value;
  }
}

export function getOpponentPromptTimestamp() {
  return lastPromptTimestamp;
}

export function resetOpponentPromptTimestamp() {
  lastPromptTimestamp = 0;
}

export function markOpponentPromptNow() {
  recordOpponentPromptTimestamp(now());
}

function readMinOverride() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.__MIN_OPPONENT_MESSAGE_DURATION_MS;
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

export function getOpponentPromptMinDuration() {
  const override = readMinOverride();
  return Number.isFinite(override) && override >= 0 ? Number(override) : DEFAULT_MIN_PROMPT_DURATION_MS;
}

export { DEFAULT_MIN_PROMPT_DURATION_MS };
