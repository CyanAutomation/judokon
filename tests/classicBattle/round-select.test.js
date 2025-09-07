import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle round select modal", () => {
  test("selecting 15 sets pointsToWin and marks target", async () => {
    process.env.VITEST = "true"; // ensure modal avoids extra event dispatch
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    // Load page init (will be updated to wire modal) and start
    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") mod.init();

    // Expect modal to render with round-select buttons
    const btnLong = await new Promise((resolveBtn) => {
      const tryFind = () => {
        const el = document.getElementById("round-select-3");
        if (el) return resolveBtn(el);
        setTimeout(tryFind, 0);
      };
      tryFind();
    });
    expect(btnLong).toBeTruthy();

    // Click the "Long" (15) option
    btnLong.click();

    // Assert engine pointsToWin updated
    const { getPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");
    expect(getPointsToWin()).toBe(15);

    // Assert page reflects target for testing via data attribute
    expect(document.body.dataset.target).toBe("15");
  });
});

