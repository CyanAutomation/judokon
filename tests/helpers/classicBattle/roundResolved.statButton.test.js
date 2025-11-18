import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { withMutedConsole } from "../../utils/console.js";

const resetSpy = vi.fn((scheduler) => {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.classList.remove("selected");
    btn.disabled = true;
    if (!btn.classList.contains("disabled")) {
      btn.classList.add("disabled");
    }
    const enableButton = () => {
      btn.disabled = false;
      btn.classList.remove("disabled");
    };
    if (scheduler && typeof scheduler.onFrame === "function") {
      try {
        scheduler.onFrame(enableButton);
      } catch {
        enableButton();
      }
      return;
    }
    enableButton();
  });
});
const disableSpy = vi.fn(() => {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.disabled = true;
    if (!btn.classList.contains("disabled")) {
      btn.classList.add("disabled");
    }
  });
});

vi.mock("../../../src/helpers/classicBattle/statButtons.js", () => ({
  resetStatButtons: resetSpy,
  disableStatButtons: disableSpy
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
  updateRoundCounter: vi.fn(),
  updateTimer: vi.fn()
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

beforeEach(async () => {
  resetSpy.mockClear();
  disableSpy.mockClear();
  document.body.innerHTML = "";
  await vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("roundResolved stat button reset", () => {
  it("clears stat selection via animation frame reset before timeout fallback", async () => {
    const timers = useCanonicalTimers();
    const rafUtils = await import("../../../src/utils/rafUtils.js");
    const frameDelayMs = 1;
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, frameDelayMs);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
    const runAfterFramesSpy = vi
      .spyOn(rafUtils, "runAfterFrames")
      .mockImplementation((frames, cb) => {
        if (frames <= 0) {
          cb();
          return;
        }
        setTimeout(() => rafUtils.runAfterFrames(frames - 1, cb), frameDelayMs);
      });
    document.body.innerHTML =
      '<div id="stat-buttons"><button data-stat="power" class="selected"></button></div>';
    const { handleRoundResolvedEvent } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );
    const btn = document.querySelector("#stat-buttons button");
    await withMutedConsole(() =>
      handleRoundResolvedEvent({
        detail: { store: {}, result: { matchEnded: false } }
      })
    );
    expect(btn.classList.contains("selected")).toBe(true);
    expect(disableSpy).toHaveBeenCalledOnce();
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("disabled")).toBe(true);
    expect(resetSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(frameDelayMs);
    expect(btn.classList.contains("selected")).toBe(true);
    expect(resetSpy).not.toHaveBeenCalled();
    expect(disableSpy).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(frameDelayMs);
    await vi.runOnlyPendingTimersAsync();
    expect(disableSpy).toHaveBeenCalledTimes(2);
    expect(resetSpy).not.toHaveBeenCalled();
    expect(btn.classList.contains("selected")).toBe(false);
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("disabled")).toBe(true);
    await vi.advanceTimersByTimeAsync(32);
    await vi.runOnlyPendingTimersAsync();
    expect(disableSpy).toHaveBeenCalledTimes(2);
    expect(resetSpy).not.toHaveBeenCalled();
    runAfterFramesSpy.mockRestore();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
    timers.cleanup();
  });

  it("falls back to timeout when animation frames are unavailable", async () => {
    const timers = useCanonicalTimers();
    const rafUtils = await import("../../../src/utils/rafUtils.js");
    const runAfterFramesSpy = vi.spyOn(rafUtils, "runAfterFrames").mockImplementation(() => {
      throw new Error("Animation frames unavailable");
    });
    document.body.innerHTML =
      '<div id="stat-buttons"><button data-stat="power" class="selected"></button></div>';
    const { handleRoundResolvedEvent } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );
    const btn = document.querySelector("#stat-buttons button");
    await withMutedConsole(() =>
      handleRoundResolvedEvent({
        detail: { store: {}, result: { matchEnded: false } }
      })
    );
    expect(btn.classList.contains("selected")).toBe(true);
    expect(disableSpy).toHaveBeenCalledOnce();
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("disabled")).toBe(true);
    expect(resetSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(32);
    await vi.runOnlyPendingTimersAsync();
    expect(disableSpy).toHaveBeenCalledTimes(2);
    expect(resetSpy).not.toHaveBeenCalled();
    expect(btn.classList.contains("selected")).toBe(false);
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("disabled")).toBe(true);
    runAfterFramesSpy.mockRestore();
    timers.cleanup();
  });
});
