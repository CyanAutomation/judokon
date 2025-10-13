import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/helpers/domReady.js", () => ({
  onDomReady: () => {}
}));

vi.mock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (callback) => {
    if (typeof callback === "function") {
      await callback();
    }
  })
}));

const battleClassicHtml = readFileSync(
  resolve(process.cwd(), "src/pages/battleClassic.html"),
  "utf-8"
);

describe("Classic Battle bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.innerHTML = battleClassicHtml;
    delete window.__battleInitComplete;
    delete window.__initCalled;
    delete window.battleStore;
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
