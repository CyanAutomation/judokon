import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockIsEnabled } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(() => false)
}));

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/featureFlags.js", async () => {
  const actual = await vi.importActual("../../src/helpers/featureFlags.js");
  return { ...actual, isEnabled: mockIsEnabled };
});

const originalTestFlag = window.__TEST__;
const originalTestApi = window.__TEST_API;
const originalBattleStateApi = window.__BATTLE_STATE_API;
const originalTimerApi = window.__TIMER_API;
const originalInitApi = window.__INIT_API;
const originalInspectApi = window.__INSPECT_API;
const originalOpponentDelay = window.__OPPONENT_RESOLVE_DELAY_MS;
const originalOpponentDelay = window.__OPPONENT_RESOLVE_DELAY_MS;
const originalPlaywrightTestFlag = window.__PLAYWRIGHT_TEST__;
const originalBattleCliInit = window.__battleCLIinit;

function restoreWindowProperty(key, value) {
  if (value === undefined) {
    delete window[key];
  } else {
    window[key] = value;
  }
}

describe("testApi.isTestMode", () => {
  beforeEach(async () => {
    vi.resetModules();

    await vi.doMock("../../src/helpers/featureFlags.js", async () => {
      const actual = await vi.importActual("../../src/helpers/featureFlags.js");

      return {
        ...actual,
        isEnabled: vi.fn(() => false)
      };
    });

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", ""); // Empty string is falsy

    restoreWindowProperty("__TEST__", undefined);
    restoreWindowProperty("__TEST_API", undefined);
    restoreWindowProperty("__BATTLE_STATE_API", undefined);
    restoreWindowProperty("__TIMER_API", undefined);
    restoreWindowProperty("__INIT_API", undefined);
    restoreWindowProperty("__INSPECT_API", undefined);
    restoreWindowProperty("__battleCLIinit", undefined);
    restoreWindowProperty("__PLAYWRIGHT_TEST__", undefined);
    delete window.__OPPONENT_RESOLVE_DELAY_MS;
    delete window.__initCalled;
  });

  afterEach(() => {
    vi.unstubAllEnvs();

    restoreWindowProperty("__TEST__", originalTestFlag);
    restoreWindowProperty("__TEST_API", originalTestApi);
    restoreWindowProperty("__BATTLE_STATE_API", originalBattleStateApi);
    restoreWindowProperty("__TIMER_API", originalTimerApi);
    restoreWindowProperty("__INIT_API", originalInitApi);
    restoreWindowProperty("__INSPECT_API", originalInspectApi);
    restoreWindowProperty("__VIEWPORT_API", originalViewportApi);
    restoreWindowProperty("__battleCLIinit", originalBattleCliInit);
    restoreWindowProperty("__PLAYWRIGHT_TEST__", originalPlaywrightTestFlag);

    if (originalOpponentDelay === undefined) {
      delete window.__OPPONENT_RESOLVE_DELAY_MS;
    } else {
      window.__OPPONENT_RESOLVE_DELAY_MS = originalOpponentDelay;
    }

    delete window.__initCalled;
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("treats the explicit Playwright flag as test mode and exposes the API", async () => {
    // Clean up before testing
    vi.resetModules();

    // Reset mock for this test
    mockIsEnabled.mockClear().mockImplementation(() => false);

    vi.stubEnv("VITEST", "");
    vi.stubEnv("NODE_ENV", "production");

    delete window.__TEST__;
    window.__PLAYWRIGHT_TEST__ = true;

    const mod = await import("../../src/helpers/testApi.js");
    const { isTestMode } = mod;

    // Should return true based on explicit Playwright flag.
    expect(isTestMode()).toBe(true);

    const originalInitCalled = window.__initCalled;
    window.__initCalled = true;
    try {
      await expect(window.__INIT_API.waitForBattleReady(5)).resolves.toBe(true);
    } finally {
      if (originalInitCalled === undefined) {
        delete window.__initCalled;
      } else {
        window.__initCalled = originalInitCalled;
      }
    }

    expect(window.__TEST_API.timers.setOpponentResolveDelay(25)).toBe(true);
    expect(window.__OPPONENT_RESOLVE_DELAY_MS).toBe(25);
    expect(window.__TEST_API.timers.setOpponentResolveDelay(null)).toBe(true);
    expect(window.__OPPONENT_RESOLVE_DELAY_MS).toBeUndefined();
  });
});

describe("initApi readiness gating", () => {
  let initApi;
  let timers;

  beforeEach(async () => {
    vi.resetModules();
    timers = useCanonicalTimers();

    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VITEST", "1");

    window.__TEST__ = true;
    delete window.battleStore;
    delete window.battleReadyPromise;
    delete window.__initCalled;
    delete window.__battleCLIinit;

    const mod = await import("../../src/helpers/testApi.js");
    initApi = mod.getTestAPI().init;
  });

  afterEach(() => {
    vi.unstubAllEnvs();

    restoreWindowProperty("__TEST__", originalTestFlag);
    restoreWindowProperty("__TEST_API", originalTestApi);
    restoreWindowProperty("__BATTLE_STATE_API", originalBattleStateApi);
    restoreWindowProperty("__TIMER_API", originalTimerApi);
    restoreWindowProperty("__INIT_API", originalInitApi);
    restoreWindowProperty("__INSPECT_API", originalInspectApi);
    restoreWindowProperty("__VIEWPORT_API", originalViewportApi);
    restoreWindowProperty("__battleCLIinit", originalBattleCliInit);

    delete window.battleStore;
    delete window.battleReadyPromise;
    delete window.__initCalled;

    timers.cleanup();

    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not report ready when the battle store is missing an orchestrator", async () => {
    window.battleStore = { ready: true };

    expect(window.__INIT_API).toBe(initApi);
    expect(initApi.isBattleReady()).toBe(false);
  });

  it("reports ready once the battle store exposes an orchestrator", async () => {
    window.battleStore = { orchestrator: { dispatch: () => {} } };

    expect(initApi.isBattleReady()).toBe(true);
  });

  it("waits for the orchestrator before resolving waitForBattleReady", async () => {
    window.battleStore = {};
    const resolutionSpy = vi.fn();
    const readyPromise = initApi.waitForBattleReady(500).then((value) => {
      resolutionSpy(value);
      return value;
    });

    vi.advanceTimersByTime(100);
    await Promise.resolve();
    expect(resolutionSpy).not.toHaveBeenCalled();

    window.battleStore.orchestrator = { dispatch: () => {} };

    vi.advanceTimersByTime(100);
    await expect(readyPromise).resolves.toBe(true);
    expect(resolutionSpy).toHaveBeenCalledWith(true);
  });

  it("indicates when the Battle CLI reset helper is unavailable", async () => {
    const result = await initApi.resetBattleCliModuleState();

    expect(result).toEqual({
      ok: false,
      count: 0,
      reason: "__battleCLIinit.__resetModuleState unavailable"
    });
  });

  it("tracks Battle CLI module reset executions to enforce battle CLI reset reliability", async () => {
    const resetSpy = vi.fn();
    window.__battleCLIinit = { __resetModuleState: resetSpy };

    const first = await initApi.resetBattleCliModuleState();
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ ok: true, count: 1, reason: null });

    const second = await initApi.resetBattleCliModuleState();
    expect(resetSpy).toHaveBeenCalledTimes(2);
    expect(second).toEqual({ ok: true, count: 2, reason: null });

    const resetCount = initApi.__resetBattleCliModuleResetCount();
    expect(resetCount).toBe(0);

    const third = await initApi.resetBattleCliModuleState();
    expect(resetSpy).toHaveBeenCalledTimes(3);
    expect(third).toEqual({ ok: true, count: 1, reason: null });
  });
});

describe("cli.completeRound", () => {
  let cliApi;
  let timerApi;
  let stateApi;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VITEST", "1");

    window.__TEST__ = true;
    delete window.__initCalled;
    delete window.battleStore;

    const mod = await import("../../src/helpers/testApi.js");
    const testApi = mod.getTestAPI();
    cliApi = testApi.cli;
    timerApi = testApi.timers;
    stateApi = testApi.state;
  });

  afterEach(() => {
    vi.unstubAllEnvs();

    restoreWindowProperty("__TEST__", originalTestFlag);
    restoreWindowProperty("__TEST_API", originalTestApi);
    restoreWindowProperty("__BATTLE_STATE_API", originalBattleStateApi);
    restoreWindowProperty("__TIMER_API", originalTimerApi);
    restoreWindowProperty("__INIT_API", originalInitApi);
    restoreWindowProperty("__INSPECT_API", originalInspectApi);
    restoreWindowProperty("__VIEWPORT_API", originalViewportApi);
    restoreWindowProperty("__battleCLIinit", originalBattleCliInit);

    delete window.__initCalled;
    delete window.battleStore;

    vi.resetModules();
    vi.clearAllMocks();
  });

  it("expires selection and dispatches the derived outcome event", async () => {
    const expireSpy = vi.fn();
    const delaySpy = vi.fn();
    const dispatchSpy = vi.fn().mockResolvedValue(true);
    const resolveSpy = vi.fn().mockResolvedValue({
      detail: { result: { outcomeEvent: "roundWin" } },
      dispatched: true,
      emitted: true
    });

    timerApi.expireSelectionTimer = expireSpy;
    timerApi.setOpponentResolveDelay = delaySpy;
    stateApi.dispatchBattleEvent = dispatchSpy;
    stateApi.getBattleState = vi.fn(() => "cooldown");
    cliApi.resolveRound = resolveSpy;

    const result = await cliApi.completeRound(
      { choice: "power" },
      { expireSelection: true, opponentResolveDelayMs: 0 }
    );

    expect(expireSpy).toHaveBeenCalledTimes(1);
    expect(delaySpy).toHaveBeenCalledWith(0);
    expect(resolveSpy).toHaveBeenCalledWith({ choice: "power" });
    expect(dispatchSpy).toHaveBeenCalledWith("roundWin", {
      result: { outcomeEvent: "roundWin" }
    });
    expect(result.outcomeEvent).toBe("roundWin");
    expect(result.finalState).toBe("cooldown");
    expect(result.outcomeDispatched).toBe(true);
  });

  it("surfaces errors when resolveRound rejects", async () => {
    const resolveSpy = vi.fn().mockRejectedValue(new Error("resolve failed"));

    cliApi.resolveRound = resolveSpy;

    await expect(cliApi.completeRound({ choice: "power" })).rejects.toThrow("resolve failed");
    expect(resolveSpy).toHaveBeenCalledWith({ choice: "power" });
  });

  it("marks outcome dispatch false when dispatchBattleEvent fails", async () => {
    const dispatchSpy = vi.fn().mockRejectedValue(new Error("dispatch failed"));
    const resolveSpy = vi.fn().mockResolvedValue({
      detail: { result: { outcomeEvent: "roundWin" } },
      dispatched: true,
      emitted: true
    });

    stateApi.dispatchBattleEvent = dispatchSpy;
    stateApi.getBattleState = vi.fn(() => "roundOver");
    cliApi.resolveRound = resolveSpy;

    const result = await cliApi.completeRound({ choice: "technique" }, { autoWaitTimeoutMs: 0 });

    expect(dispatchSpy).toHaveBeenCalledWith("roundWin", {
      result: { outcomeEvent: "roundWin" }
    });
    expect(result.outcomeDispatched).toBe(false);
    expect(result.finalState).toBe("roundOver");
  });

  it("handles missing timer/dispatch APIs without throwing", async () => {
    const resolveSpy = vi.fn().mockResolvedValue({
      detail: { result: { outcomeEvent: "roundWin" } },
      dispatched: true,
      emitted: true
    });

    timerApi.expireSelectionTimer = undefined;
    timerApi.setOpponentResolveDelay = undefined;
    stateApi.dispatchBattleEvent = undefined;
    stateApi.getBattleState = vi.fn(() => "cooldown");
    cliApi.resolveRound = resolveSpy;

    const result = await cliApi.completeRound({ choice: "speed" }, { autoWaitTimeoutMs: 0 });

    expect(result.outcomeEvent).toBe("roundWin");
    expect(result.outcomeDispatched).toBe(false);
    expect(result.finalState).toBe("cooldown");
  });
});
