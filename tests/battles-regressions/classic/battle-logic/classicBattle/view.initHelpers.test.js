import { describe, it, expect, vi } from "vitest";
import "./commonMocks.js";
import createClassicBattleDebugAPI from "../../../src/helpers/classicBattle/setupTestHelpers.js";
import setupScheduler from "../../../src/helpers/classicBattle/setupScheduler.js";
import setupUIBindings from "../../../src/helpers/classicBattle/setupUIBindings.js";
import setupDebugHooks from "../../../src/helpers/classicBattle/setupDebugHooks.js";

vi.mock("../../../src/helpers/battle/index.js", () => ({
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
const battle = await import("../../../src/helpers/battle/index.js");
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
  it("starts and registers stop handler", () => {
    const add = vi.spyOn(window, "addEventListener");
    const original = process.env.VITEST;
    delete process.env.VITEST;
    setupScheduler();
    process.env.VITEST = original;
    expect(scheduler.start).toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith("pagehide", scheduler.stop, { once: true });
    add.mockRestore();
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
