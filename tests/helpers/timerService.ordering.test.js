import { describe, it, expect, vi } from "vitest";

describe("timerService timeout ordering", () => {
  it("auto-select starts without waiting for timeout dispatch to resolve", async () => {
    vi.resetModules();

    // Minimal DOM
    document.body.innerHTML = '<div id="next-round-timer"></div><div id="stat-buttons"><button data-stat="a"></button></div>';

    // Scoreboard + UI stubs
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: () => {},
      showMessage: () => {},
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {}
    }));
    vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
      updateDebugPanel: () => {}
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
    vi.doMock("../../src/helpers/classicBattle/battleDispatcher.js", () => ({
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

    // Fake round timer factory: trigger expired synchronously on start
    vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => {
      return {
        createRoundTimer: () => {
          const handlers = { tick: [], expired: [], drift: [] };
          return {
            on: (event, fn) => handlers[event]?.push(fn),
            start: () => {
              // simulate immediate expiry
              handlers.tick.forEach((fn) => fn(0));
              handlers.expired.forEach((fn) => fn());
            },
            stop: () => {}
          };
        }
      };
    });

    // Import module under test
    const mod = await import("../../src/helpers/classicBattle/timerService.js");

    // Start timer with a no-op onExpiredSelect
    await mod.startTimer(async () => {});

    // At this point, `timeout` dispatch is pending; ensure autoSelect has begun
    expect(autoSelectCalled).toBe(true);

    // Resolve the timeout dispatch to allow the pending await to finish
    resolveTimeout();
  });
});

