import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle round select modal", () => {
  test("selecting 15 sets pointsToWin and marks target", async () => {
    process.env.VITEST = "true"; // ensure modal avoids extra event dispatch
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init?.();

    const { getRoundPromptPromise } = await import("../../src/helpers/classicBattle.js");
    const roundPrompt = getRoundPromptPromise();

    const btnLong = document.getElementById("round-select-3");
    expect(btnLong).toBeTruthy();

    btnLong.click();

    await roundPrompt;

    const { getPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");
    expect(getPointsToWin()).toBe(15);
    expect(document.body.dataset.target).toBe("15");
  });
});
