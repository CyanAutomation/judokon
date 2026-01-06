import { describe, it, expect, vi, beforeEach } from "vitest";
import "./commonMocks.js";
import createClassicBattleDebugAPI from "../../../src/helpers/classicBattle/setupTestHelpers.js";
import setupScheduler from "../../../src/helpers/classicBattle/setupScheduler.js";
import setupUIBindings from "../../../src/helpers/classicBattle/setupUIBindings.js";
import setupDebugHooks from "../../../src/helpers/classicBattle/setupDebugHooks.js";

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
vi.mock("../../../src/helpers/classicBattle/interruptHandlers.js", () => ({
  initInterruptHandlers: vi.fn()
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
  handlers: eventHandlers
}));
vi.mock("../../../src/helpers/battleStateProgress.js", () => ({
  initBattleStateProgress: vi.fn().mockResolvedValue(() => {})
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({
  initTooltips: vi.fn().mockResolvedValue()
}));

const scheduler = await import("../../../src/utils/scheduler.js");
const skipHandler = await import("../../../src/helpers/classicBattle/skipHandler.js");
const battle = await import("../../../src/helpers/classicBattle/statButtons.js");
const uiHelpers = await import("../../../src/helpers/classicBattle/uiHelpers.js");
const debugPanel = await import("../../../src/helpers/classicBattle/debugPanel.js");
const events = await import("../../../src/helpers/classicBattle/battleEvents.js");

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts and registers stop handler", () => {
    const add = vi.spyOn(window, "addEventListener");
    const originalTest = globalThis.__TEST__;

    delete globalThis.__TEST__;

    setupScheduler();

    globalThis.__TEST__ = originalTest;

    expect(scheduler.start).toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith("pagehide", scheduler.stop, { once: true });
    add.mockRestore();
  });

  it("registers visibilitychange listener for pause/resume", () => {
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const addDocListener = vi.spyOn(document, "addEventListener");
    const originalTest = globalThis.__TEST__;

    delete globalThis.__TEST__;

    setupScheduler();

    globalThis.__TEST__ = originalTest;

    // Verify visibilitychange listener was registered
    const visibilityCall = addDocListener.mock.calls.find((call) => call[0] === "visibilitychange");
    expect(visibilityCall).toBeDefined();

    const visibilityHandler = visibilityCall[1];

    // Test pause when document becomes hidden
    Object.defineProperty(document, "hidden", {
      value: true,
      writable: true,
      configurable: true
    });
    visibilityHandler();
    expect(scheduler.pause).toHaveBeenCalled();

    // Test resume when document becomes visible
    vi.clearAllMocks();
    Object.defineProperty(document, "hidden", {
      value: false,
      writable: true,
      configurable: true
    });
    visibilityHandler();
    expect(scheduler.resume).toHaveBeenCalled();

    addWindowListener.mockRestore();
    addDocListener.mockRestore();
  });

  it("skips setup when globalThis.__TEST__ is set", () => {
    const originalTest = globalThis.__TEST__;
    globalThis.__TEST__ = true;

    setupScheduler();

    expect(scheduler.start).not.toHaveBeenCalled();

    globalThis.__TEST__ = originalTest;
  });

  it("skips setup when requestAnimationFrame is unavailable", () => {
    const originalRAF = globalThis.requestAnimationFrame;
    // @ts-ignore - Intentionally delete for test
    delete globalThis.requestAnimationFrame;

    setupScheduler();

    expect(scheduler.start).not.toHaveBeenCalled();

    globalThis.requestAnimationFrame = originalRAF;
  });

  it.skip("DEPRECATED: process.env.VITEST removed from codebase", () => {
    // Note: This test would normally be caught by beforeEach mock setup
    // but we verify the condition explicitly

    setupScheduler();

    expect(scheduler.start).not.toHaveBeenCalled();

    if (original !== undefined) {
    } else {
    }
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
