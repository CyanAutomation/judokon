import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as timerUtils from "../../src/helpers/timerUtils.js";

describe("Classic Battle round timer", () => {
  test("starts after round selection and updates countdown", async () => {
    // Force a short timer for the test
    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 2;
      return 3;
    });
    try {
      const file = resolve(process.cwd(), "src/pages/battleClassic.html");
      const html = readFileSync(file, "utf-8");
      document.documentElement.innerHTML = html;

      const mod = await import("../../src/pages/battleClassic.init.js");
      if (typeof mod.init === "function") mod.init();

      // Click the 15 button to start the match and timer
      const waitForBtn = () =>
        new Promise((r) => {
          const loop = () => {
            const el = document.getElementById("round-select-3");
            if (el) return r(el);
            setTimeout(loop, 0);
          };
          loop();
        });
      const btn = await waitForBtn();
      btn.click();

      const timerEl = document.getElementById("next-round-timer");
      expect(timerEl).toBeTruthy();
      // It should show a countdown shortly
      await new Promise((r) => setTimeout(r, 10));
      expect(timerEl.textContent || "").toMatch(/Time Left:/);
      // After ~2s it should clear on expiration
      await new Promise((r) => setTimeout(r, 2200));
      expect(timerEl.textContent || "").toBe("");
      // Auto-select hook should record a stat
      expect(document.body.dataset.autoSelected).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});

