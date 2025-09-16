/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as timerUtils from "../../src/helpers/timerUtils.js";
import { resetFallbackScores } from "../../src/helpers/api/battleUI.js";
import { setTestMode } from "../../src/helpers/testModeUtils.js";
import { createBattleEngine } from "../../src/helpers/battleEngineFacade.js";

describe.configure({ environment: "jsdom" })("Classic Battle round resolution", () => {
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
      const waitForBtn = () =>
        new Promise((r) => {
          const loop = () => {
            const el = document.getElementById("round-select-2");
            if (el) return r(el);
            setTimeout(loop, 0);
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
      // Ensure all timers are cleared to avoid async leaks
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  }, 15000); // 15s timeout
});
