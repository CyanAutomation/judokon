import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle bootstrap", () => {
  test("initializes scoreboard on DOMContentLoaded", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    // Import the page init and trigger DOMContentLoaded
    const mod = await import("../../src/pages/battleClassic.init.js");
    // Call init explicitly to avoid flakiness around DOMContentLoaded in JSDOM
    if (typeof mod.init === "function") mod.init();

    const score = document.getElementById("score-display");
    const round = document.getElementById("round-counter");
    expect(score).toBeTruthy();
    expect(round).toBeTruthy();
    // Scoreboard shows initial score text
    expect(score.textContent || "").toMatch(/You:\s*0/);
    expect(score.textContent || "").toMatch(/Opponent:\s*0/);
    // Round counter starts at 0
    expect(round.textContent || "").toMatch(/Round\s*0/);
  });

  test("replay resets scoreboard", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") await mod.init();

    const { onBattleEvent, offBattleEvent } = await import(
      "../../src/helpers/classicBattle/battleEvents.js"
    );
    const { setPointsToWin, createBattleEngine } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    const { handleStatSelection, handleReplay, _resetForTest } = await import(
      "../../src/helpers/classicBattle.js"
    );
    const { getState } = await import("../../src/components/Scoreboard.js");

    const roundResolvedPromise = new Promise((resolve) => {
      const handler = (e) => {
        offBattleEvent("roundResolved", handler);
        resolve(e);
      };
      onBattleEvent("roundResolved", handler);
    });

    setPointsToWin(1);
    const store = window.battleStore;
    await handleStatSelection(store, "power", {
      playerVal: 5,
      opponentVal: 3,
      forceDirectResolution: true
    });
    await roundResolvedPromise;
    expect(getState().score.player).toBe(1);

    createBattleEngine({ forceCreate: true });
    await handleReplay(store);
    const { player, opponent } = getState().score;
    expect(player).toBe(0);
    expect(opponent).toBe(0);

    _resetForTest(store);
  });
});
