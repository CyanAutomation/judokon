import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle round select modal", () => {
  test("selecting Long (10) sets pointsToWin and marks target", async () => {
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
    expect(getPointsToWin()).toBe(10);
    expect(document.body.dataset.target).toBe("10");
  });

  test("round options match PRD values [3,5,10]", async () => {
    const rounds = await import("../../src/data/battleRounds.js");
    const values = rounds.default.map((r) => r.value);
    expect(values).toEqual([3, 5, 10]);
  });

  test("tooltips reflect correct win targets", async () => {
    const tooltips = await import("../../src/data/tooltips.json");
    expect(tooltips.default.ui.roundQuick).toContain("First to 3 points");
    expect(tooltips.default.ui.roundMedium).toContain("First to 5 points");
    expect(tooltips.default.ui.roundLong).toContain("First to 10 points");
  });
});
