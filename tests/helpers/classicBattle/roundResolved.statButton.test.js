import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  handleReplay: vi.fn(),
  startCooldown: vi.fn(),
  setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms))
}));
vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  startTimer: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/autoSelectHandlers.js", () => ({
  handleStatSelectionTimeout: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  clearRoundCounter: vi.fn(),
  updateRoundCounter: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  disableNextRoundButton: vi.fn(),
  syncScoreDisplay: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  setOpponentDelay: vi.fn(),
  getOpponentDelay: () => 0
}));
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));
vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

beforeEach(() => {
  resetSpy.mockClear();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("roundResolved stat button reset", () => {
  it("keeps .selected for one frame before clearing", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML =
      '<div id="stat-buttons"><button data-stat="power" class="selected"></button></div>';
    const roundUI = await import("../../../src/helpers/classicBattle/roundUI.js");
    const btn = document.querySelector("#stat-buttons button");
    await roundUI.handleRoundResolvedEvent({
      detail: { store: {}, result: { matchEnded: false } }
    });
    expect(btn.classList.contains("selected")).toBe(true);
    await vi.advanceTimersByTimeAsync(16);
    expect(btn.classList.contains("selected")).toBe(true);
    expect(resetSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(16);
    await vi.runOnlyPendingTimersAsync();
    expect(resetSpy).toHaveBeenCalledOnce();
    expect(btn.classList.contains("selected")).toBe(false);
    warn.mockRestore();
  });

  it("falls back to timeout when animation frames do not flush", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const callbacks = [];
    const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    document.body.innerHTML =
      '<div id="stat-buttons"><button data-stat="power" class="selected"></button></div>';
    const roundUI = await import("../../../src/helpers/classicBattle/roundUI.js");
    const btn = document.querySelector("#stat-buttons button");
    await roundUI.handleRoundResolvedEvent({
      detail: { store: {}, result: { matchEnded: false } }
    });
    expect(btn.classList.contains("selected")).toBe(true);
    expect(resetSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(32);
    await vi.runOnlyPendingTimersAsync();
    expect(resetSpy).toHaveBeenCalledOnce();
    expect(btn.classList.contains("selected")).toBe(false);
    while (callbacks.length) {
      const cb = callbacks.shift();
      cb?.(0);
    }
    expect(resetSpy).toHaveBeenCalledOnce();
    raf.mockRestore();
    warn.mockRestore();
  });
});
