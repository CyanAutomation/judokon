import { describe, it, expect, beforeEach, vi } from "vitest";

const isEnabledMock = vi.fn();
const setDebugPanelEnabledMock = vi.fn();
const getCurrentSeedMock = vi.fn();

vi.mock("../../../src/helpers/featureFlags.js", () => ({
  isEnabled: isEnabledMock
}));

vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn(),
  setDebugPanelEnabled: setDebugPanelEnabledMock
}));

vi.mock("../../../src/helpers/testModeUtils.js", () => ({
  getCurrentSeed: getCurrentSeedMock
}));

describe("applyBattleFeatureFlags", () => {
  beforeEach(() => {
    vi.resetModules();
    isEnabledMock.mockReset();
    setDebugPanelEnabledMock.mockReset();
    getCurrentSeedMock.mockReset();
    document.body.innerHTML = `
      <div id="battle-area"></div>
      <p id="test-mode-banner" hidden></p>
    `;
  });

  it("enables banner and debug helpers when test mode is active", async () => {
    isEnabledMock.mockReturnValue(true);
    getCurrentSeedMock.mockReturnValue(42);
    const { applyBattleFeatureFlags } = await import(
      "../../../src/helpers/classicBattle/uiHelpers.js"
    );

    const battleArea = document.getElementById("battle-area");
    const banner = document.getElementById("test-mode-banner");
    const result = applyBattleFeatureFlags(battleArea, banner);

    expect(result).toBe(true);
    expect(setDebugPanelEnabledMock).toHaveBeenCalledWith(true);
    expect(battleArea?.getAttribute("data-test-mode")).toBe("true");
    expect(battleArea?.getAttribute("data-feature-test-mode")).toBe("true");
    expect(banner?.hidden).toBe(false);
    expect(banner?.hasAttribute("hidden")).toBe(false);
    expect(banner?.dataset.seed).toBe("42");
    expect(banner?.textContent).toContain("seed 42");
  });

  it("hides banner and removes attributes when test mode is disabled", async () => {
    isEnabledMock.mockReturnValue(false);
    const { applyBattleFeatureFlags } = await import(
      "../../../src/helpers/classicBattle/uiHelpers.js"
    );

    const battleArea = document.getElementById("battle-area");
    const banner = document.getElementById("test-mode-banner");
    banner.removeAttribute("hidden");
    banner.hidden = false;
    banner.dataset.seed = "99";
    battleArea?.setAttribute("data-test-mode", "true");
    battleArea?.setAttribute("data-feature-test-mode", "true");

    const result = applyBattleFeatureFlags(battleArea, banner);

    expect(result).toBe(false);
    expect(setDebugPanelEnabledMock).toHaveBeenCalledWith(false);
    expect(battleArea?.hasAttribute("data-test-mode")).toBe(false);
    expect(battleArea?.hasAttribute("data-feature-test-mode")).toBe(false);
    expect(banner?.hidden).toBe(true);
    expect(banner?.textContent).toBe("");
    expect(banner?.dataset.seed).toBeUndefined();
  });
});
