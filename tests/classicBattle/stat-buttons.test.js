import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as timerUtils from "../../src/helpers/timerUtils.js";
import { resetFallbackScores } from "../../src/helpers/api/battleUI.js";

describe("Classic Battle stat buttons", () => {
  test("render enabled after start; clicking resolves and starts cooldown", async () => {
    // Reset fallback scores for clean test state
    resetFallbackScores();

    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 5; // allow time for click
      if (cat === "coolDownTimer") return 1;
      return 3;
    });
    try {
      const file = resolve(process.cwd(), "src/pages/battleClassic.html");
      const html = readFileSync(file, "utf-8");
      document.documentElement.innerHTML = html;

      const mod = await import("../../src/pages/battleClassic.init.js");
      await mod.init();

      // Start the match via modal
      const waitForBtn = () =>
        new Promise((r) => {
          const loop = () => {
            const el = document.getElementById("round-select-2");
            if (el) return r(el);
            setTimeout(loop, 0);
          };
          loop();
        });
      const startBtn = await waitForBtn();
      startBtn.click();

      // Wait for stat buttons to render and be enabled
      await window.statButtonsReadyPromise;
      const container = document.getElementById("stat-buttons");
      expect(container).toBeTruthy();
      // Should have at least one button and be marked ready
      const buttons = container.querySelectorAll("button[data-stat]");
      expect(buttons.length).toBeGreaterThan(0);
      expect(container.dataset.buttonsReady).toBe("true");
      // Buttons should be enabled
      buttons.forEach((b) => expect(b.disabled).toBe(false));

      // Start awaiting cooldown before triggering event (promise self-resets after dispatch)
      const nextRoundTimerReady = window.nextRoundTimerReadyPromise;
      // Click the first stat button
      buttons[0].click();

      // Selection should resolve quickly; timer clears and score updates deterministically
      await new Promise((r) => setTimeout(r, 50));
      const timerEl = document.getElementById("next-round-timer");
      const scoreEl = document.getElementById("score-display");
      expect(timerEl.textContent || "").toBe("");
      expect(scoreEl.textContent || "").toMatch(/You:\s*1/);
      expect(scoreEl.textContent || "").toMatch(/Opponent:\s*0/);
      // Cooldown should begin and Next should be ready
      await nextRoundTimerReady;
      const next = document.getElementById("next-button");
      expect(next.disabled).toBe(false);
      expect(next.getAttribute("data-next-ready")).toBe("true");
    } finally {
      spy.mockRestore();
    }
  });
});
