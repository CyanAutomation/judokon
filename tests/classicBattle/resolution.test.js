/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as timerUtils from "../../src/helpers/timerUtils.js";
import { resetFallbackScores } from "../../src/helpers/api/battleUI.js";
import { setTestMode } from "../../src/helpers/testModeUtils.js";
import { createBattleEngine } from "../../src/helpers/battleEngineFacade.js";

describe("Classic Battle round resolution", () => {
  test("score updates after auto-select on expiry", async () => {
    // Ensure deterministic test mode and engine state
    setTestMode({ enabled: true, seed: 1 });
    createBattleEngine({ forceCreate: true });
    resetFallbackScores();
    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 1;
      return 3;
    });
    try {
      const file = resolve(process.cwd(), "src/pages/battleClassic.html");
      const html = readFileSync(file, "utf-8");
      document.documentElement.innerHTML = html;

      // Allow tests to opt-in to showing the round select modal even when
      // Test Mode is enabled (mirrors Playwright behavior).
      try {
        if (typeof window !== "undefined") {
          window.__FF_OVERRIDES = Object.assign(window.__FF_OVERRIDES || {}, {
            showRoundSelectModal: true
          });
        }
      } catch {}

      const mod = await import("../../src/pages/battleClassic.init.js");
      if (typeof mod.init === "function") mod.init();

      const { onBattleEvent, offBattleEvent } = await import(
        "../../src/helpers/classicBattle/battleEvents.js"
      );

      const roundResolvedPromise = new Promise((resolve) => {
        const handler = (e) => {
          offBattleEvent("nextRoundTimerReady", handler);
          resolve(e);
        };
        onBattleEvent("nextRoundTimerReady", handler);
      });

      // Open modal and pick any option to start
      // Wait for the button to appear, but guard against test teardown and long waits.
      const waitForBtn = (timeout = 5000) =>
        new Promise((resolve, reject) => {
          const start = Date.now();
          let timerId = null;

          const clear = () => {
            if (timerId !== null) {
              clearTimeout(timerId);
              timerId = null;
            }
          };

          const loop = () => {
            try {
              if (typeof document === "undefined") {
                clear();
                return reject(new Error("document is undefined (teardown detected)"));
              }

              const el = document.getElementById("round-select-2");
              if (el) {
                clear();
                return resolve(el);
              }

              if (Date.now() - start > timeout) {
                clear();
                return reject(new Error("waitForBtn timed out waiting for #round-select-2"));
              }

              timerId = setTimeout(loop, 20);
            } catch (err) {
              // Defensive: if document lookup throws because environment was torn down,
              // reject instead of letting an uncaught exception bubble up after teardown.
              clear();
              return reject(err);
            }
          };

          loop();
        });
      const btn = await waitForBtn();

      vi.useFakeTimers();
      btn.click();
      vi.advanceTimersByTime(1200);
      await roundResolvedPromise;

      const scoreEl = document.getElementById("score-display");
      expect(scoreEl.textContent || "").toMatch(/You:\s*1/);
      expect(scoreEl.textContent || "").toMatch(/Opponent:\s*0/);
    } finally {
      spy.mockRestore();
      // Defensive cleanup: only run pending timers / restore real timers if fake timers were active.
      try {
        vi.runOnlyPendingTimers();
      } catch {
        // Ignore: timers were not mocked or already restored.
      }
      try {
        vi.useRealTimers();
      } catch {
        // Ignore: timers were not mocked.
      }
    }
  }, 15000); // 15s timeout
});
