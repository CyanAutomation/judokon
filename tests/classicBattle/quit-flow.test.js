import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle quit flow", () => {
  test("clicking Quit opens confirmation modal", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") {
      await mod.init();
    }

    const quit = document.getElementById("quit-button");
    expect(quit).toBeTruthy();
    quit.click();

    const confirmBtn = await window.quitConfirmButtonPromise;
    expect(confirmBtn).toBeTruthy();
  });
});
