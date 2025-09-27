import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: vi.fn(() => false)
}));

const originalNodeEnv = process.env.NODE_ENV;
const originalVitestFlag = process.env.VITEST;
const originalTestFlag = window.__TEST__;
const originalHref = window.location.href;
const originalTestApi = window.__TEST_API;
const originalBattleStateApi = window.__BATTLE_STATE_API;
const originalTimerApi = window.__TIMER_API;
const originalInitApi = window.__INIT_API;
const originalInspectApi = window.__INSPECT_API;
const originalViewportApi = window.__VIEWPORT_API;
const originalOpponentDelay = window.__OPPONENT_RESOLVE_DELAY_MS;
const originalWebdriverDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "webdriver");
const originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");

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
  beforeEach(() => {
    vi.resetModules();

    process.env.NODE_ENV = "production";
    delete process.env.VITEST;

    restoreWindowProperty("__TEST__", undefined);
    restoreWindowProperty("__TEST_API", undefined);
    restoreWindowProperty("__BATTLE_STATE_API", undefined);
    restoreWindowProperty("__TIMER_API", undefined);
    restoreWindowProperty("__INIT_API", undefined);
    restoreWindowProperty("__INSPECT_API", undefined);
    restoreWindowProperty("__VIEWPORT_API", undefined);
    delete window.__OPPONENT_RESOLVE_DELAY_MS;
    delete window.__initCalled;

    window.history.replaceState({}, "", "https://example.com/");

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

    if (originalOpponentDelay === undefined) {
      delete window.__OPPONENT_RESOLVE_DELAY_MS;
    } else {
      window.__OPPONENT_RESOLVE_DELAY_MS = originalOpponentDelay;
    }

    window.history.replaceState({}, "", originalHref);

    if (originalWebdriverDescriptor) {
      Object.defineProperty(window.navigator, "webdriver", originalWebdriverDescriptor);
    } else {
      delete window.navigator.webdriver;
    }

    if (originalUserAgentDescriptor) {
      Object.defineProperty(window.navigator, "userAgent", originalUserAgentDescriptor);
    }

    delete window.__initCalled;

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
