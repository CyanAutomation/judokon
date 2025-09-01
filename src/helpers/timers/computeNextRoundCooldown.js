import { isTestModeEnabled } from "../testModeUtils.js";

const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Determine the cooldown duration before the next round.
 *
 * @pseudocode
 * 1. Read `window.__NEXT_ROUND_COOLDOWN_MS` or default to 3000ms.
 * 2. If test mode is enabled via `utils.isTestModeEnabled()`, force cooldown to 1.
 * 3. Otherwise convert to whole seconds and clamp to \>=1.
 * 4. Log test mode state and resolved cooldown; wrap each warn in try.
 *
 * @param {{isTestModeEnabled: () => boolean}} [utils] - Test mode utilities (for injection).
 * @returns {number} Cooldown in seconds.
 */
export function computeNextRoundCooldown(utils = { isTestModeEnabled }) {
  const overrideMs =
    typeof window !== "undefined" && typeof window.__NEXT_ROUND_COOLDOWN_MS === "number"
      ? window.__NEXT_ROUND_COOLDOWN_MS
      : 3000;
  let cooldownSeconds;
  try {
    const enabled =
      typeof utils.isTestModeEnabled === "function" ? utils.isTestModeEnabled() : false;
    cooldownSeconds = enabled ? 1 : Math.max(1, Math.round(overrideMs / 1000));
  } catch {
    cooldownSeconds = Math.max(1, Math.round(overrideMs / 1000));
  }
  if (!IS_VITEST) {
    if (isTestModeEnabled()) {
      try {
        console.warn(`[test] startCooldown: testMode=true cooldown=${cooldownSeconds}`);
      } catch {}
    } else {
      try {
        console.warn(`[test] startCooldown: testMode=false cooldown=${cooldownSeconds}`);
      } catch {}
    }
  }
  return cooldownSeconds;
}
