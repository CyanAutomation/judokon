/**
 * Wait until the classic battle state reaches "cooldown".
 *
 * @pseudocode
 * 1. Read `window.__classicBattleState`.
 * 2. If state is missing or already "cooldown", resolve immediately.
 * 3. Otherwise, listen for `battle:state` events until `{to: "cooldown"}`.
 * 4. Log a test warning while waiting.
 *
 * @returns {Promise<void>} Resolves when the state is cooldown.
 */
export function awaitCooldownState() {
  return new Promise((resolve) => {
    try {
      const state =
        typeof window !== "undefined" && window.__classicBattleState
          ? window.__classicBattleState
          : null;
      if (!state || state === "cooldown") {
        resolve();
        return;
      }
      const onState = (e) => {
        try {
          const to = e && e.detail ? e.detail.to : null;
          if (to === "cooldown") {
            document.removeEventListener("battle:state", onState);
            resolve();
          }
        } catch {}
      };
      document.addEventListener("battle:state", onState);
      try {
        console.warn(`[test] expiration deferred until cooldown; state=${state}`);
      } catch {}
    } catch {
      resolve();
    }
  });
}
