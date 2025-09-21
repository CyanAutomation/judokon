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
