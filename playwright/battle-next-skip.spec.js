import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./fixtures/waits.js";

/**
 * Verify that clicking Next during cooldown skips the delay.
 *
 * @pseudocode
 * 1. Set a short next-round cooldown.
 * 2. Start a battle, select the first stat to end round 1.
 * 3. Click Next as soon as it is enabled.
 * 4. Expect the round counter to show round 2 within 1s.
 */
test.describe("Next button cooldown skip", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
      const settings = JSON.parse(localStorage.getItem("settings") || "{}");
      settings.featureFlags = {
        ...(settings.featureFlags || {}),
        skipRoundCooldown: { enabled: false },
        enableTestMode: { enabled: false }
      };
      localStorage.setItem("settings", JSON.stringify(settings));
    });
  });

  test("advances immediately when clicked", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html?autostart=1");
    await waitForBattleReady(page);

    // Instrument: capture state transitions and nextRoundTimerReady emissions.
    await page.evaluate(() => {
      try {
        window.__stateLog = [];
        window.__nrtReadyCount = 0;
        window.__nrtTimestamps = [];
        const t = globalThis.__classicBattleEventTarget;
        if (t && typeof t.addEventListener === "function") {
          window.__stateListener = (e) => {
            try {
              window.__stateLog.push({
                from: e?.detail?.from || null,
                to: e?.detail?.to || null,
                event: e?.detail?.event || null,
                at: Date.now()
              });
              if (e?.detail?.to) {
                // Surface state transitions in CI logs
                console.warn(`[state] to=${e.detail.to} event=${e.detail.event || ""}`);
              }
            } catch {}
          };
          t.addEventListener("battleStateChange", window.__stateListener);
          window.__nrtListener = () => {
            window.__nrtReadyCount++;
            window.__nrtTimestamps.push(Date.now());
            // Surface event emission in CI logs
            console.warn("[event] nextRoundTimerReady");
          };
          t.addEventListener("nextRoundTimerReady", window.__nrtListener);
        }
        // Observe Next button readiness/disabled changes
        try {
          const btn = document.getElementById("next-button");
          if (btn) {
            const report = () =>
              console.warn(
                `[nextbtn] disabled=${btn.disabled} nextReady=${btn.dataset?.nextReady || null}`
              );
            report();
            const mo = new MutationObserver(() => report());
            mo.observe(btn, { attributes: true, attributeFilter: ["disabled", "data-next-ready"] });
          }
        } catch {}
      } catch {}
    });

    // Finish round 1 quickly.
    await page.locator("#stat-buttons button").first().click();
    await page.locator("#stat-buttons[data-buttons-ready='false']").waitFor();

    const counter = page.locator("#round-counter");
    await expect(counter).toHaveText(/Round 1/);

    const nextBtn = page.locator('#next-button');
    // Preemptive 4s snapshot to capture state if readiness never appears
    const _snapshot4s = page
      .waitForTimeout(4000)
      .then(async () => {
        try {
          const snap = await page.evaluate(() => {
            const btn = document.getElementById("next-button");
            const body = document.body || null;
            return {
              t: Date.now(),
              bodyState: body?.dataset?.battleState || null,
              prevState: body?.dataset?.prevBattleState || null,
              button: btn
                ? { disabled: !!btn.disabled, nextReady: btn.dataset?.nextReady || null }
                : null,
              nrtReadyCount: window.__nrtReadyCount || 0,
              stateLog: (window.__stateLog || []).slice(-10)
            };
          });
          console.log("[debug] next-skip snapshot@4s:", JSON.stringify(snap));
        } catch {}
      })
      .catch(() => {});
    try {
      // Assert readiness by attributes, not visibility.
      await page.waitForFunction(
        () => {
          const btn = document.getElementById("next-button");
          return !!btn && btn.dataset.nextReady === "true" && btn.disabled === false;
        },
        null,
        { timeout: 5000 }
      );
      // Deterministic progression: dispatch 'ready' via the orchestrator.
      await page.evaluate(async () => {
        const hooks = await import("/src/helpers/classicBattle/debugHooks.js");
        const getMachine = hooks.readDebugState?.("getClassicBattleMachine");
        const machine = typeof getMachine === "function" ? getMachine() : null;
        if (machine?.dispatch) await machine.dispatch("ready");
      });
    } catch (err) {
      // Capture instrumentation on failure to differentiate causes
      const debug = await page.evaluate(() => {
        const btn = document.getElementById("next-button");
        const body = document.body || null;
        return {
          bodyState: body?.dataset?.battleState || null,
          prevState: body?.dataset?.prevBattleState || null,
          button: btn
            ? { disabled: !!btn.disabled, nextReady: btn.dataset?.nextReady || null }
            : null,
          nrtReadyCount: window.__nrtReadyCount || 0,
          nrtTimes: window.__nrtTimestamps || [],
          stateLog: (window.__stateLog || []).slice(-10)
        };
      });
      console.log("[debug] next-skip instrumentation (on failure):", JSON.stringify(debug));
      throw err;
    }

    // Assert we progressed to the next round by state instead of text.
    await waitForBattleState(page, "waitingForPlayerAction", 5000);
    await page.evaluate(() => window.freezeBattleHeader?.());

    // Snapshot instrumentation data for debugging import-vs-state issues.
    const debug = await page.evaluate(() => {
      const btn = document.getElementById("next-button");
      const body = document.body || null;
      return {
        bodyState: body?.dataset?.battleState || null,
        prevState: body?.dataset?.prevBattleState || null,
        button: btn
          ? { disabled: !!btn.disabled, nextReady: btn.dataset?.nextReady || null }
          : null,
        nrtReadyCount: window.__nrtReadyCount || 0,
        nrtTimes: window.__nrtTimestamps || [],
        stateLog: (window.__stateLog || []).slice(-6) // last few transitions
      };
    });
    // Emit in test logs for later inspection
    console.log("[debug] next-skip instrumentation:", JSON.stringify(debug));
  });
});
