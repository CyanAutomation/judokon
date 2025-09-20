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
      // Use shared test utility to wait for DOM nodes safely
      const waitForElement = (await import("../utils/waitForElement.js")).default;
      const btn = await waitForElement("#round-select-2", { timeout: 5000, interval: 20 });

  vi.useFakeTimers();
  btn.click();
  // If tests use the queued RAF mock, flush any enqueued frames so scheduled work runs.
  if (typeof globalThis.flushRAF === "function") globalThis.flushRAF();
      vi.advanceTimersByTime(1200);
      // Ensure any pending fake timers and RAF callbacks run
      try {
        await vi.runAllTimersAsync();
      } catch {}
      if (typeof globalThis.flushRAF === "function") {
        globalThis.flushRAF();
        // flush again in case callbacks scheduled other callbacks
        globalThis.flushRAF();
      }
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
