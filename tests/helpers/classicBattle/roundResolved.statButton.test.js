import { describe, it, expect, vi } from "vitest";

const resetSpy = vi.fn(() => {
  document
    .querySelectorAll("#stat-buttons button")
    .forEach((btn) => btn.classList.remove("selected"));
});

vi.mock("../../../src/helpers/battle/index.js", () => ({
  resetStatButtons: resetSpy
}));
vi.mock("../../../src/helpers/classicBattle/uiService.js", () => ({
  syncScoreDisplay: vi.fn(),
  showMatchSummaryModal: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  handleReplay: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  startTimer: vi.fn(),
  handleStatSelectionTimeout: vi.fn(),
  scheduleNextRound: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  clearRoundCounter: vi.fn(),
  updateRoundCounter: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  disableNextRoundButton: vi.fn(),
  showSelectionPrompt: vi.fn(),
  updateDebugPanel: vi.fn()
}));
vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));

describe("roundResolved stat button reset", () => {
  it("keeps .selected for one frame before clearing", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML =
      '<div id="stat-buttons"><button data-stat="power" class="selected"></button></div>';
    await import("../../../src/helpers/classicBattle/roundUI.js");
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const btn = document.querySelector("#stat-buttons button");
    emitBattleEvent("roundResolved", { store: {}, result: { matchEnded: false } });
    expect(btn.classList.contains("selected")).toBe(true);
    await vi.advanceTimersByTimeAsync(16);
    expect(btn.classList.contains("selected")).toBe(true);
    expect(resetSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(16);
    expect(resetSpy).toHaveBeenCalledOnce();
    expect(btn.classList.contains("selected")).toBe(false);
    warn.mockRestore();
    vi.useRealTimers();
  });
});
