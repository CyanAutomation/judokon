import { describe, it, expect, vi, afterEach } from "vitest";
import "./commonMocks.js";
import createClassicBattleDebugAPI from "../../../src/helpers/classicBattle/setupTestHelpers.js";
import setupScheduler, {
  resetSchedulerState,
  shouldStartScheduler
} from "../../../src/helpers/classicBattle/setupScheduler.js";
import {
  setupUIBindings,
  unbindReplayClickListener
} from "../../../src/helpers/classicBattle/setupUIBindings.js";
import setupDebugHooks from "../../../src/helpers/classicBattle/setupDebugHooks.js";
import { naturalClick } from "../../utils/componentTestUtils.js";

vi.mock("../../../src/helpers/classicBattle/statButtons.js", () => ({
  resetStatButtons: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
  skipCurrentPhase: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  setupScoreboard: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/quitButton.js", () => ({
  initQuitButton: vi.fn()
}));
const interruptCleanupMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/helpers/classicBattle/interruptHandlers.js", () => ({
  initInterruptHandlers: vi.fn(() => interruptCleanupMock)
}));
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
  return {
    ...actual,
    watchBattleOrientation: vi.fn(),
    setupNextButton: vi.fn(),
    initStatButtons: vi.fn(() => ({ enable: vi.fn(), disable: vi.fn() })),
    applyStatLabels: vi.fn(() => Promise.resolve()),
    maybeShowStatHint: vi.fn(),
    registerRoundStartErrorHandler: vi.fn()
  };
});
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  initDebugPanel: vi.fn()
}));
const eventHandlers = vi.hoisted(() => ({}));
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: vi.fn((name, cb) => {
    eventHandlers[name] = cb;
  }),
  emitBattleEvent: vi.fn(),
  handlers: eventHandlers
}));
vi.mock("../../../src/helpers/battleStateProgress.js", () => ({
  initBattleStateProgress: vi.fn().mockResolvedValue(() => {})
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({
  initTooltips: vi.fn().mockResolvedValue()
}));
vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  handleReplay: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../../../src/helpers/testModeUtils.js", () => ({
  isTestModeEnabled: vi.fn()
}));

const scheduler = await import("../../../src/utils/scheduler.js");
const skipHandler = await import("../../../src/helpers/classicBattle/skipHandler.js");
const battle = await import("../../../src/helpers/classicBattle/statButtons.js");
const uiHelpers = await import("../../../src/helpers/classicBattle/uiHelpers.js");
const debugPanel = await import("../../../src/helpers/classicBattle/debugPanel.js");
const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
const roundManager = await import("../../../src/helpers/classicBattle/roundManager.js");
const testModeUtils = await import("../../../src/helpers/testModeUtils.js");

afterEach(() => {
  unbindReplayClickListener();
  resetSchedulerState();
  interruptCleanupMock.mockClear();
});

function makeView() {
  return {
    controller: {
      battleStore: {},
      timerControls: { pauseTimer: vi.fn(), resumeTimer: vi.fn() },
      startRound: vi.fn()
    },
    startRound: vi.fn(),
    applyBattleOrientation: vi.fn()
  };
}

describe("createClassicBattleDebugAPI", () => {
  it("returns helpers for tests", async () => {
    const view = makeView();
    const api = createClassicBattleDebugAPI(view);
    expect(api.battleStore).toBe(view.controller.battleStore);
    await api.skipBattlePhase();
    expect(skipHandler.skipCurrentPhase).toHaveBeenCalled();
    expect(battle.resetStatButtons).toHaveBeenCalled();
    api.startRoundOverride();
    expect(view.startRound).toHaveBeenCalled();
    api.freezeBattleHeader();
    expect(scheduler.stop).toHaveBeenCalled();
    api.resumeBattleHeader();
    expect(scheduler.start).toHaveBeenCalled();
  });
});

describe("setupScheduler", () => {
  it("returns true when no test flags are set and RAF exists", () => {
    expect(
      shouldStartScheduler({
        env: {},
        globals: {},
        testModeEnabled: false,
        hasRAF: true
      })
    ).toBe(true);
  });

  it("returns false when a global test flag is set", () => {
    expect(
      shouldStartScheduler({
        env: {},
        globals: { __TEST__: true },
        testModeEnabled: false,
        hasRAF: true
      })
    ).toBe(false);
  });

  it("returns false when Vitest env flag is set", () => {
    expect(
      shouldStartScheduler({
        env: { VITEST: "1" },
        globals: {},
        testModeEnabled: false,
        hasRAF: true
      })
    ).toBe(false);
  });

  it("returns false when test mode is enabled", () => {
    expect(
      shouldStartScheduler({
        env: {},
        globals: {},
        testModeEnabled: true,
        hasRAF: true
      })
    ).toBe(false);
  });

  it("returns false when requestAnimationFrame is unavailable", () => {
    expect(
      shouldStartScheduler({
        env: {},
        globals: {},
        testModeEnabled: false,
        hasRAF: false
      })
    ).toBe(false);
  });

  it("returns true when env and globals are undefined", () => {
    expect(
      shouldStartScheduler({
        env: undefined,
        globals: undefined,
        testModeEnabled: false,
        hasRAF: true
      })
    ).toBe(true);
  });

  it("returns true when env and globals are null", () => {
    expect(
      shouldStartScheduler({
        env: null,
        globals: null,
        testModeEnabled: false,
        hasRAF: true
      })
    ).toBe(true);
  });

  it("wires scheduler start and listeners when guards allow", () => {
    const startSpy = vi.spyOn(scheduler, "start");
    const stopSpy = vi.spyOn(scheduler, "stop");
    const pauseSpy = vi.spyOn(scheduler, "pause");
    const resumeSpy = vi.spyOn(scheduler, "resume");
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const addDocListener = vi.spyOn(document, "addEventListener");
    const removeDocListener = vi.spyOn(document, "removeEventListener");

    testModeUtils.isTestModeEnabled.mockReturnValue(false);
    vi.stubGlobal("requestAnimationFrame", vi.fn());

    const originalVitestEnv = process.env.VITEST;
    const hasVitestGlobal = Object.prototype.hasOwnProperty.call(globalThis, "__VITEST__");
    const hasTestGlobal = Object.prototype.hasOwnProperty.call(globalThis, "__TEST__");
    const originalVitestGlobal = globalThis.__VITEST__;
    const originalTestGlobal = globalThis.__TEST__;
    delete process.env.VITEST;
    delete globalThis.__VITEST__;
    delete globalThis.__TEST__;

    try {
      setupScheduler();
    } finally {
      if (originalVitestEnv !== undefined) {
        process.env.VITEST = originalVitestEnv;
      }
      if (hasVitestGlobal) {
        globalThis.__VITEST__ = originalVitestGlobal;
      }
      if (hasTestGlobal) {
        globalThis.__TEST__ = originalTestGlobal;
      }
    }

    expect(startSpy).toHaveBeenCalled();
    expect(addWindowListener).toHaveBeenCalledWith("pagehide", expect.any(Function), {
      once: true
    });
    const pagehideCall = addWindowListener.mock.calls.find((call) => call[0] === "pagehide");
    expect(pagehideCall).toBeDefined();
    pagehideCall[1]();
    expect(stopSpy).toHaveBeenCalled();
    expect(removeDocListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("pagehide", expect.any(Function));
    const visibilityCall = addDocListener.mock.calls.find((call) => call[0] === "visibilitychange");
    expect(visibilityCall).toBeDefined();

    const visibilityHandler = visibilityCall[1];
    const hiddenGetter = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    visibilityHandler();
    expect(pauseSpy).toHaveBeenCalled();

    hiddenGetter.mockReturnValue(false);
    visibilityHandler();
    expect(resumeSpy).toHaveBeenCalled();

    hiddenGetter.mockRestore();

    addWindowListener.mockRestore();
    removeWindowListener.mockRestore();
    addDocListener.mockRestore();
    removeDocListener.mockRestore();
    startSpy.mockRestore();
    stopSpy.mockRestore();
    pauseSpy.mockRestore();
    resumeSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("allows scheduler setup to run again after pagehide teardown", () => {
    const startSpy = vi.spyOn(scheduler, "start");
    const addWindowListener = vi.spyOn(window, "addEventListener");

    testModeUtils.isTestModeEnabled.mockReturnValue(false);
    vi.stubGlobal("requestAnimationFrame", vi.fn());

    const originalVitestEnv = process.env.VITEST;
    const hasVitestGlobal = Object.prototype.hasOwnProperty.call(globalThis, "__VITEST__");
    const hasTestGlobal = Object.prototype.hasOwnProperty.call(globalThis, "__TEST__");
    const originalVitestGlobal = globalThis.__VITEST__;
    const originalTestGlobal = globalThis.__TEST__;
    delete process.env.VITEST;
    delete globalThis.__VITEST__;
    delete globalThis.__TEST__;

    try {
      setupScheduler();
      const firstPagehideCall = addWindowListener.mock.calls.find((call) => call[0] === "pagehide");
      expect(firstPagehideCall).toBeDefined();
      firstPagehideCall[1]();
      setupScheduler();
    } finally {
      if (originalVitestEnv !== undefined) {
        process.env.VITEST = originalVitestEnv;
      }
      if (hasVitestGlobal) {
        globalThis.__VITEST__ = originalVitestGlobal;
      }
      if (hasTestGlobal) {
        globalThis.__TEST__ = originalTestGlobal;
      }
    }

    expect(startSpy).toHaveBeenCalledTimes(2);

    startSpy.mockRestore();
    addWindowListener.mockRestore();
    vi.unstubAllGlobals();
  });

  it("does not wire scheduler twice when setupScheduler is called repeatedly", () => {
    const startSpy = vi.spyOn(scheduler, "start");
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const addDocListener = vi.spyOn(document, "addEventListener");

    testModeUtils.isTestModeEnabled.mockReturnValue(false);
    vi.stubGlobal("requestAnimationFrame", vi.fn());

    const originalVitestEnv = process.env.VITEST;
    const hasVitestGlobal = Object.prototype.hasOwnProperty.call(globalThis, "__VITEST__");
    const hasTestGlobal = Object.prototype.hasOwnProperty.call(globalThis, "__TEST__");
    const originalVitestGlobal = globalThis.__VITEST__;
    const originalTestGlobal = globalThis.__TEST__;
    delete process.env.VITEST;
    delete globalThis.__VITEST__;
    delete globalThis.__TEST__;

    try {
      setupScheduler();
      setupScheduler();
    } finally {
      if (originalVitestEnv !== undefined) {
        process.env.VITEST = originalVitestEnv;
      }
      if (hasVitestGlobal) {
        globalThis.__VITEST__ = originalVitestGlobal;
      }
      if (hasTestGlobal) {
        globalThis.__TEST__ = originalTestGlobal;
      }
    }

    const visibilityRegistrations = addDocListener.mock.calls.filter(
      (call) => call[0] === "visibilitychange"
    );

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(visibilityRegistrations).toHaveLength(1);

    const pagehideCall = addWindowListener.mock.calls.find((call) => call[0] === "pagehide");
    expect(pagehideCall).toBeDefined();
    pagehideCall[1]();
    resetSchedulerState();

    startSpy.mockRestore();
    addWindowListener.mockRestore();
    addDocListener.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("setupUIBindings", () => {
  it("binds UI helpers and events", async () => {
    const view = makeView();
    await setupUIBindings(view);
    const { setupScoreboard } = await import("../../../src/helpers/setupScoreboard.js");
    expect(setupScoreboard).toHaveBeenCalledWith(view.controller.timerControls);
    expect(uiHelpers.watchBattleOrientation).toHaveBeenCalled();
    const statControls = uiHelpers.initStatButtons.mock.results[0].value;
    events.handlers["statButtons:enable"]();
    expect(statControls.enable).toHaveBeenCalled();
    events.handlers["statButtons:disable"]();
    expect(statControls.disable).toHaveBeenCalled();
    const tooltip = await import("../../../src/helpers/tooltip.js");
    expect(tooltip.initTooltips).toHaveBeenCalled();
  });

  it("runs interrupt cleanup on pagehide teardown", async () => {
    const view = makeView();
    interruptCleanupMock.mockClear();

    await setupUIBindings(view);
    window.dispatchEvent(new Event("pagehide"));

    expect(interruptCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("does not register duplicate replay listeners when setup runs twice", async () => {
    // This test validates delegated document click behavior end-to-end.
    // A real button is required so `closest(...)` resolution matches production flow.
    const view = makeView();
    const replayButton = document.createElement("button");
    replayButton.setAttribute("data-testid", "replay-button");
    document.body.append(replayButton);

    roundManager.handleReplay.mockClear();
    await setupUIBindings(view);
    await setupUIBindings(view);

    naturalClick(replayButton);
    await Promise.resolve();

    expect(roundManager.handleReplay).toHaveBeenCalledTimes(1);
    expect(roundManager.handleReplay).toHaveBeenCalledWith(view.controller.battleStore);

    replayButton.remove();
  });

  it("unbindReplayClickListener removes replay delegation and clears state", async () => {
    const view = makeView();
    const replayButton = document.createElement("button");
    replayButton.setAttribute("data-testid", "replay-button");
    document.body.append(replayButton);

    roundManager.handleReplay.mockClear();
    await setupUIBindings(view);
    unbindReplayClickListener();

    naturalClick(replayButton);
    await Promise.resolve();

    expect(roundManager.handleReplay).not.toHaveBeenCalled();

    replayButton.remove();
  });

  it("ignores rapid replay double-clicks while replay flow is in flight", async () => {
    const view = makeView();
    const replayButton = document.createElement("button");
    replayButton.setAttribute("data-testid", "replay-button");
    document.body.append(replayButton);

    let resolveReplay;
    const replayPromise = new Promise((resolve) => {
      resolveReplay = resolve;
    });
    roundManager.handleReplay.mockClear();
    roundManager.handleReplay.mockReturnValueOnce(replayPromise);
    await setupUIBindings(view);

    naturalClick(replayButton);
    naturalClick(replayButton);
    await Promise.resolve();

    expect(roundManager.handleReplay).toHaveBeenCalledTimes(1);
    expect(roundManager.handleReplay).toHaveBeenCalledWith(view.controller.battleStore);

    resolveReplay();
    await replayPromise;
    await Promise.resolve();

    naturalClick(replayButton);
    await Promise.resolve();

    expect(roundManager.handleReplay).toHaveBeenCalledTimes(2);

    replayButton.remove();
  });
});

describe("setupDebugHooks", () => {
  it("initializes debug panel and error handler", () => {
    const view = makeView();
    setupDebugHooks(view);
    expect(debugPanel.initDebugPanel).toHaveBeenCalled();
    const cb = uiHelpers.registerRoundStartErrorHandler.mock.calls[0][0];
    cb();
    expect(view.startRound).toHaveBeenCalled();
  });
});
