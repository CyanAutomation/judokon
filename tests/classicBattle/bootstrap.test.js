// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/helpers/domReady.js", () => ({
  onDomReady: () => {}
}));

vi.mock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  resolveRoundStartPolicy: vi.fn(async (callback) => {
    if (typeof callback === "function") {
      await callback();
    }
  })
}));

let battleClassicHtml;
function getBattleClassicHtml() {
  if (!battleClassicHtml) {
    battleClassicHtml = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return battleClassicHtml;
}

describe("Classic Battle bootstrap", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = getBattleClassicHtml();
    delete window.__battleInitComplete;
    delete window.__initCalled;
    delete window.battleStore;
    delete window.battleReadyPromise;
  });

  test("initializes scoreboard via setupClassicBattlePage", async () => {
    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattle/bootstrap.js");

    await setupClassicBattlePage();

    const score = document.getElementById("score-display");
    const round = document.getElementById("round-counter");

    expect(score).toBeTruthy();
    expect(round).toBeTruthy();
    expect(score?.textContent || "").toMatch(/You:\s*0/);
    expect(score?.textContent || "").toMatch(/Opponent:\s*0/);
    expect(round?.textContent || "").toMatch(/Round\s*\d+/);
    expect(window.__initCalled).toBe(true);
    expect(window.__battleInitComplete).toBe(true);
  });

  test("returns the resolved debug API and exposes readiness promise", async () => {
    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattle/bootstrap.js");
    const debugApi = await setupClassicBattlePage();

    expect(debugApi).toBeTruthy();
    expect(debugApi).toBe(window.__classicbattledebugapi);
    expect(window.battleReadyPromise).toBeInstanceOf(Promise);
    await expect(window.battleReadyPromise).resolves.toBe(debugApi);
  });

  test("exposes battle store and debug helpers on window", async () => {
    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattle/bootstrap.js");
    await setupClassicBattlePage();

    const store = window.battleStore;
    expect(store).toBeTruthy();
    expect(window.__classicbattledebugapi).toBeTruthy();
    expect(window.__classicbattledebugapi?.battleStore).toBe(store);
    expect(typeof window.__classicbattledebugapi?.skipBattlePhase).toBe("function");
    expect(typeof window.__classicbattledebugapi?.round?.advanceAfterCooldown).toBe("function");
  });
});
