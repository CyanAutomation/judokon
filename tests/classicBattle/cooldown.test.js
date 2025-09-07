import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as timerUtils from "../../src/helpers/timerUtils.js";

describe("Classic Battle inter-round cooldown + Next", () => {
  test("enables Next during cooldown and advances on click", async () => {
    // Make round timer short so resolution happens quickly
    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 1;
      // Provide a small but non-zero cooldown to exercise readiness
      if (cat === "coolDownTimer") return 1;
      return 3;
    });
    try {
      const file = resolve(process.cwd(), "src/pages/battleClassic.html");
      const html = readFileSync(file, "utf-8");
      document.documentElement.innerHTML = html;

      const mod = await import("../../src/pages/battleClassic.init.js");
      if (typeof mod.init === "function") mod.init();

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
      const btn = await waitForBtn();
      btn.click();

      // Wait for round expiry + deterministic resolution
      await new Promise((r) => setTimeout(r, 1200));

      // After resolution, cooldown should start and Next becomes ready
      const next = document.getElementById("next-button");
      expect(next).toBeTruthy();
      // Allow any microtasks to wire the cooldown
      await new Promise((r) => setTimeout(r, 10));
      expect(next.disabled).toBe(false);
      expect(next.getAttribute("data-next-ready")).toBe("true");

      // onNextButtonClick should resolve the ready promise
      const { getNextRoundControls } = await import(
        "../../src/helpers/classicBattle/roundManager.js"
      );
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");

      const controls = getNextRoundControls();
      expect(controls && controls.ready).toBeTruthy();
      const readyPromise = controls.ready;

      // Click the Next button to advance
      await onNextButtonClick(new MouseEvent("click"), controls);
      // The ready promise should resolve promptly
      await expect(readyPromise).resolves.toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});
