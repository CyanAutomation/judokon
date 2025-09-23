import { describe, it, expect, vi, beforeEach } from "vitest";

const helpersPath = "../../../src/helpers";
const controllerModule = `${helpersPath}/classicBattle/controller.js`;

describe("ClassicBattleController.init", () => {
  let setTestMode;
  let initFeatureFlags;
  let isEnabled;
  let featureFlagsEmitter;

  beforeEach(() => {
    vi.resetModules();

    setTestMode = vi.fn();
    initFeatureFlags = vi.fn().mockResolvedValue();
    isEnabled = vi.fn().mockReturnValue(false);
    featureFlagsEmitter = new EventTarget();

    vi.doMock(`${helpersPath}/testModeUtils.js`, () => ({
      setTestMode
    }));
    vi.doMock(`${helpersPath}/featureFlags.js`, () => ({
      initFeatureFlags,
      isEnabled,
      featureFlagsEmitter
    }));
    vi.doMock(`${helpersPath}/classicBattle/roundManager.js`, () => ({
      createBattleStore: () => ({}),
      startRound: vi.fn()
    }));
    vi.doMock(`${helpersPath}/classicBattle/orchestrator.js`, () => ({
      initClassicBattleOrchestrator: vi.fn().mockResolvedValue({})
    }));
    vi.doMock(`${helpersPath}/battleEngineFacade.js`, () => ({
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      createBattleEngine: vi.fn(),
      getEngine: vi.fn(() => ({}))
    }));
  });

  it("enables deterministic RNG after feature flags resolve", async () => {
    let resolveFlags;
    initFeatureFlags.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFlags = resolve;
        })
    );
    isEnabled.mockImplementation((flag) => flag === "enableTestMode");

    const { ClassicBattleController } = await import(controllerModule);
    const controller = new ClassicBattleController();

    const initPromise = controller.init();
    expect(setTestMode).not.toHaveBeenCalled();

    resolveFlags?.();
    await initPromise;

    expect(setTestMode).toHaveBeenCalledTimes(1);
    expect(setTestMode).toHaveBeenCalledWith({ enabled: true });
  });

  it("re-syncs deterministic mode when feature flags change", async () => {
    let enableTestMode = true;
    isEnabled.mockImplementation((flag) => (flag === "enableTestMode" ? enableTestMode : false));

    const { ClassicBattleController } = await import(controllerModule);
    const controller = new ClassicBattleController();

    await controller.init();
    expect(setTestMode).toHaveBeenLastCalledWith({ enabled: true });

    enableTestMode = false;
    featureFlagsEmitter.dispatchEvent(new Event("change"));

    expect(setTestMode).toHaveBeenCalledTimes(2);
    expect(setTestMode).toHaveBeenLastCalledWith({ enabled: false });
  });
});
