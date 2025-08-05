import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let clearComputerJudoka;
let renderMock;
let setupLazyPortraits;

describe("classicBattle uiHelpers", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="computer-card"></div>';
    clearComputerJudoka = vi.fn();
    renderMock = vi.fn(async () => undefined);
    setupLazyPortraits = vi.fn();

    vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
      getComputerJudoka: vi.fn(() => ({ id: 1 })),
      getGokyoLookup: vi.fn(() => ({})),
      clearComputerJudoka
    }));

    vi.mock("../../../src/helpers/settingsUtils.js", () => ({
      loadSettings: vi.fn(async () => ({ featureFlags: {} }))
    }));

    vi.mock("../../../src/components/JudokaCard.js", () => ({
      JudokaCard: vi.fn(() => ({ render: renderMock }))
    }));

    vi.mock("../../../src/helpers/lazyPortrait.js", () => ({
      setupLazyPortraits
    }));
  });

  afterEach(() => {
    vi.unmock("../../../src/helpers/classicBattle/cardSelection.js");
    vi.unmock("../../../src/helpers/settingsUtils.js");
    vi.unmock("../../../src/components/JudokaCard.js");
    vi.unmock("../../../src/helpers/lazyPortrait.js");
    vi.resetModules();
  });

  it("handles missing rendered card without throwing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { revealComputerCard } = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    await expect(revealComputerCard()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    expect(clearComputerJudoka).not.toHaveBeenCalled();
    expect(setupLazyPortraits).not.toHaveBeenCalled();
    expect(document.getElementById("computer-card").innerHTML).toBe("");
    errorSpy.mockRestore();
  });
});
