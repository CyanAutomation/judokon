import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

const seedInputHtml = '<input id="seed-input" type="number" />';

describe("battleCLI deterministic seed", () => {
  beforeEach(() => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("applies seed for deterministic random", async () => {
    const mod = await loadBattleCLI({
      url: "http://localhost/battleCLI.html?seed=5",
      html: seedInputHtml
    });
    await mod.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
    const { seededRandom } = await import("../../src/helpers/testModeUtils.js");
    const first = seededRandom();
    const second = seededRandom();
    const expected = (start, count) => {
      const out = [];
      let s = start;
      for (let i = 0; i < count; i++) {
        const x = Math.sin(s++) * 10000;
        out.push(x - Math.floor(x));
      }
      return out;
    };
    const [e1, e2] = expected(5, 2);
    expect(first).toBeCloseTo(e1);
    expect(second).toBeCloseTo(e2);
    expect(localStorage.getItem("battleCLI.seed")).toBe("5");
  });

  it("changing seed does not auto-start", async () => {
    const mod = await loadBattleCLI({
      url: "http://localhost/battleCLI.html?seed=0",
      html: seedInputHtml
    });
    await mod.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent.mockClear();
    const input = document.getElementById("seed-input");
    input.value = "12";
    input.dispatchEvent(new Event("change"));
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
  });
});
