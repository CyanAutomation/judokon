import { describe, it, expect, vi } from "vitest";
import { mount, clearBody } from "./domUtils.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { dispatchSpy, autoSelectStatMock } = vi.hoisted(() => {
  // Will be reset per-test to create new Promise for timeoutPromise
  let resolveTimeout;
  const createTimeoutPromise = () => new Promise((r) => (resolveTimeout = r));

  const dispatchSpyMock = vi.fn((eventName) => {
    if (eventName === "timeout") return createTimeoutPromise();
    return Promise.resolve();
  });

  const autoSelectStatMock = vi.fn(async (onSelect) => {
    // Track whether autoSelect kicked off
    window.__autoSelectCalled = true;
    try {
      await onSelect("a", { delayOpponentMessage: true });
    } catch {}
  });

  return { dispatchSpy: dispatchSpyMock, autoSelectStatMock };
});

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: () => {},
  showMessage: () => {},
  showAutoSelect: () => {},
  showTemporaryMessage: () => () => {},
  updateTimer: () => {},
  updateRoundCounter: () => {},
  clearRoundCounter: () => {}
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: () => {},
  skipRoundCooldownIfEnabled: () => false
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: () => {},
  updateSnackbar: () => {}
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: () => 1
}));

vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: dispatchSpy
}));

vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: autoSelectStatMock
}));

describe("timerService timeout ordering", () => {
  it("auto-select starts without waiting for timeout dispatch to resolve", async () => {
    vi.resetModules();

    // Minimal DOM
    mount(
      '<div id="next-round-timer"></div><div id="stat-buttons"><button data-stat="a"></button></div>'
    );

    // Reset tracking flag and clear auto-select-called state
    window.__autoSelectCalled = false;

    // All mocks now configured at module-level via vi.mock()
    // Skip the 5 vi.doMock() calls that were here

    // Deterministic immediate expiration via shared helper
    const { mockCreateRoundTimer } = await import("./roundTimerMock.js");
    mockCreateRoundTimer({
      scheduled: false,
      ticks: [0],
      expire: true,
      moduleId: "../../src/helpers/timers/createRoundTimer.js"
    });

    // Import module under test
    const mod = await import("../../src/helpers/classicBattle/timerService.js");

    // Start timer with a no-op onExpiredSelect
    await mod.startTimer(async () => {}, { selectionMade: false });

    // At this point, `timeout` dispatch is pending; ensure autoSelect has begun
    expect(window.__autoSelectCalled).toBe(true);

    clearBody();
  });
});
