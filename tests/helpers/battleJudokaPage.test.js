import { describe, it, expect, vi } from "vitest";

describe("battleJudokaPage", () => {
  it("blocks stat selection until the mystery card is rendered", async () => {
    const statContainer = document.createElement("div");
    statContainer.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.dataset.stat = "power";
    statContainer.appendChild(btn);
    document.body.appendChild(statContainer);
    const link = document.createElement("a");
    link.dataset.testid = "home-link";
    document.body.appendChild(link);

    let resolveRound;
    const startRound = vi.fn(() => new Promise((r) => { resolveRound = r; }));
    const handleStatSelection = vi.fn();
    const quitMatch = vi.fn();

    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      startRound,
      handleStatSelection,
      quitMatch
    }));
    vi.doMock("../../src/helpers/domReady.js", () => ({
      onDomReady: (fn) => fn()
    }));

    const { setupBattleJudokaPage } = await import(
      "../../src/helpers/battleJudokaPage.js"
    );

    setupBattleJudokaPage();

    expect(btn.disabled).toBe(true);
    resolveRound();
    await Promise.resolve();
    expect(btn.disabled).toBe(false);
  });
});
