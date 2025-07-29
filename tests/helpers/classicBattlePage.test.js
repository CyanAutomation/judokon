import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("classicBattlePage stat help tooltip", () => {
  it("shows tooltip only once", async () => {
    vi.useFakeTimers();
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const loadSettings = vi.fn().mockResolvedValue({ featureFlags: {} });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      startRound,
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));

    const help = document.createElement("button");
    help.id = "stat-help";
    document.body.appendChild(help);
    const spy = vi.spyOn(help, "dispatchEvent");

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();
    await vi.runAllTimersAsync();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0].type).toBe("mouseenter");
    expect(spy.mock.calls[1][0].type).toBe("mouseleave");
    expect(localStorage.getItem("statHintShown")).toBe("true");

    spy.mockClear();
    await setupClassicBattlePage();
    await vi.runAllTimersAsync();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("classicBattlePage test mode flag", () => {
  it("applies data attribute and banner visibility when enabled", async () => {
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: {
        enableTestMode: {
          enabled: true,
          label: "Test Mode",
          description: "Deterministic card draws for testing"
        }
      }
    });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      startRound,
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));

    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const banner = document.createElement("div");
    banner.id = "test-mode-banner";
    banner.className = "hidden";
    document.body.append(battleArea, banner);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    expect(battleArea.dataset.testMode).toBe("true");
    expect(banner.classList.contains("hidden")).toBe(false);
    expect(setTestMode).toHaveBeenCalledWith(true);
  });
});
