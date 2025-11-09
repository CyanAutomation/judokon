import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalVitestFlag = process.env.VITEST;
const originalTestFlag = window.__TEST__;
const originalTestApi = window.__TEST_API;
const originalBattleStateApi = window.__BATTLE_STATE_API;
const originalTimerApi = window.__TIMER_API;
const originalInitApi = window.__INIT_API;
const originalInspectApi = window.__INSPECT_API;
const originalViewportApi = window.__VIEWPORT_API;
const originalOpponentDelay = window.__OPPONENT_RESOLVE_DELAY_MS;
const originalWebdriverDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "webdriver");
const originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");
const originalBattleCliInit = window.__battleCLIinit;

function setNavigatorWebdriver(value) {
  try {
    Object.defineProperty(window.navigator, "webdriver", {
      configurable: true,
      get: () => value
    });
    return true;
  } catch {
    return false;
  }
}

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

    process.env.NODE_ENV = "production";
    delete process.env.VITEST;

    restoreWindowProperty("__TEST__", undefined);
    restoreWindowProperty("__TEST_API", undefined);
    restoreWindowProperty("__BATTLE_STATE_API", undefined);
    restoreWindowProperty("__TIMER_API", undefined);
    restoreWindowProperty("__INIT_API", undefined);
    restoreWindowProperty("__INSPECT_API", undefined);
    restoreWindowProperty("__VIEWPORT_API", undefined);
    restoreWindowProperty("__battleCLIinit", undefined);
    delete window.__OPPONENT_RESOLVE_DELAY_MS;
    delete window.__initCalled;

    // Mock location to return a URL that doesn't trigger localhost check
    vi.stubGlobal("location", {
      href: "http://example.com/",
      hostname: "example.com",
      protocol: "http:",
      host: "example.com"
    });

    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (jsdom)",
      writable: false
    });

    setNavigatorWebdriver(false);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;

    if (originalVitestFlag === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = originalVitestFlag;
    }

    restoreWindowProperty("__TEST__", originalTestFlag);
    restoreWindowProperty("__TEST_API", originalTestApi);
    restoreWindowProperty("__BATTLE_STATE_API", originalBattleStateApi);
    restoreWindowProperty("__TIMER_API", originalTimerApi);
    restoreWindowProperty("__INIT_API", originalInitApi);
    restoreWindowProperty("__INSPECT_API", originalInspectApi);
    restoreWindowProperty("__VIEWPORT_API", originalViewportApi);
    restoreWindowProperty("__battleCLIinit", originalBattleCliInit);

    if (originalOpponentDelay === undefined) {
      delete window.__OPPONENT_RESOLVE_DELAY_MS;
    } else {
      window.__OPPONENT_RESOLVE_DELAY_MS = originalOpponentDelay;
    }

    if (originalWebdriverDescriptor) {
      Object.defineProperty(window.navigator, "webdriver", originalWebdriverDescriptor);
    } else {
      delete window.navigator.webdriver;
    }

    if (originalUserAgentDescriptor) {
      Object.defineProperty(window.navigator, "userAgent", originalUserAgentDescriptor);
    }

    delete window.__initCalled;

    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("treats webdriver automation as test mode and exposes the API", async () => {
    vi.resetModules();
    const mod = await import("../../src/helpers/testApi.js");
    const { exposeTestAPI, getTestAPI, isTestMode } = mod;

    expect(isTestMode()).toBe(false);
    expect(window.__TEST_API).toBeUndefined();

    setNavigatorWebdriver(true);

    expect(isTestMode()).toBe(true);

    exposeTestAPI();

    const waitForBattleReadySpy = vi
      .spyOn(window.__INIT_API, "waitForBattleReady")
      .mockResolvedValue(true);

    expect(window.__TEST_API).toBe(getTestAPI());
    expect(window.__INIT_API).toBeDefined();

    const originalInitCalled = window.__initCalled;
    window.__initCalled = true;
    try {
      await expect(window.__INIT_API.waitForBattleReady(5)).resolves.toBe(true);
    } finally {
      waitForBattleReadySpy.mockRestore();
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

    process.env.NODE_ENV = "test";
    process.env.VITEST = "1";

    window.__TEST__ = true;
    delete window.battleStore;
    delete window.battleReadyPromise;
    delete window.__initCalled;
    delete window.__battleCLIinit;

    const mod = await import("../../src/helpers/testApi.js");
    initApi = mod.getTestAPI().init;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalVitestFlag === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = originalVitestFlag;
    }

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

  it("tracks Battle CLI module reset executions", async () => {
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
