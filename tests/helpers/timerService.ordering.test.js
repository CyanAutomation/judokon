import { describe, it, expect, vi } from "vitest";

describe("timerService timeout ordering", () => {
  it("auto-select starts without waiting for timeout dispatch to resolve", async () => {
    vi.resetModules();

    // Minimal DOM
    document.body.innerHTML =
      '<div id="next-round-timer"></div><div id="stat-buttons"><button data-stat="a"></button></div>';

    // Scoreboard + UI stubs
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: () => {},
      showMessage: () => {},
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {},
      updateTimer: () => {}
    }));
    vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
      updateDebugPanel: () => {},
      skipRoundCooldownIfEnabled: () => false
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: () => {},
      updateSnackbar: () => {}
    }));

    // Short round timer
    vi.doMock("../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 1
    }));

    // Controlled dispatcher: make `timeout` awaitable
    let resolveTimeout;
    const timeoutPromise = new Promise((r) => (resolveTimeout = r));
    const dispatchSpy = vi.fn((eventName) => {
      if (eventName === "timeout") return timeoutPromise;
      return Promise.resolve();
    });
    vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: dispatchSpy
    }));

    // Track whether autoSelect kicked off before timeout resolved
    let autoSelectCalled = false;
    vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: vi.fn(async (onSelect) => {
        autoSelectCalled = true;
        // call the provided onSelect immediately to simulate selection
        try {
          await onSelect("a", { delayOpponentMessage: true });
        } catch {}
      })
    }));

    // Deterministic immediate expiration via shared helper
    const { mockCreateRoundTimer } = await import("./roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [0], expire: true, moduleId: "../../src/helpers/timers/createRoundTimer.js" });

    // Import module under test
    const mod = await import("../../src/helpers/classicBattle/timerService.js");

    // Start timer with a no-op onExpiredSelect
    await mod.startTimer(async () => {}, { selectionMade: false });

    // At this point, `timeout` dispatch is pending; ensure autoSelect has begun
    expect(autoSelectCalled).toBe(true);

    // Resolve the timeout dispatch to allow the pending await to finish
    resolveTimeout();
  });
});
