/**
 * Apply deterministic cooldown fixtures for the classic battle page.
 * @pseudocode
 * MERGE provided timer overrides with sensible defaults.
 * INJECT them before page scripts using `addInitScript`.
 * ENSURE the round select modal is available for user-driven start.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} [options]
 * @param {number} [options.cooldownMs=0] - Cooldown duration override in ms
 * @param {number|null} [options.roundTimerMs=1] - Round timer override in ms (null to skip)
 * @param {boolean} [options.showRoundSelectModal=true] - Whether to force the round select modal
 * @returns {Promise<void>}
 */
export async function applyDeterministicCooldown(page, options = {}) {
  const { cooldownMs = 0, roundTimerMs = 1, showRoundSelectModal = true } = options;

  if (typeof cooldownMs !== "number" || Number.isNaN(cooldownMs) || cooldownMs < 0) {
    throw new Error("cooldownMs must be a non-negative number");
  }

  await page.addInitScript(
    ({ cooldown, roundTimer, showModal }) => {
      if (typeof window === "undefined") {
        return;
      }

      if (typeof roundTimer === "number") {
        window.__OVERRIDE_TIMERS = { roundTimer };
      }

      window.__NEXT_ROUND_COOLDOWN_MS = cooldown;

      if (showModal) {
        const existingOverrides =
          window.__FF_OVERRIDES && typeof window.__FF_OVERRIDES === "object"
            ? window.__FF_OVERRIDES
            : {};
        window.__FF_OVERRIDES = { ...existingOverrides, showRoundSelectModal: true };
      }
    },
    { cooldown: cooldownMs, roundTimer: roundTimerMs, showModal: showRoundSelectModal }
  );
}
