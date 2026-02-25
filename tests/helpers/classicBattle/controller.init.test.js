import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const helpersPath = "../../../src/helpers";
const controllerModule = `${helpersPath}/classicBattle/controller.js`;

const orchestratorMock = vi.hoisted(() => {
  const module = {
    initClassicBattleOrchestrator: vi.fn().mockResolvedValue({ start: vi.fn() }),
    disposeClassicBattleOrchestrator: vi.fn(),
    __reset() {
      module.initClassicBattleOrchestrator.mockClear();
      module.disposeClassicBattleOrchestrator.mockClear();
    }
  };
  return module;
});

const battleEngineFacadeMock = vi.hoisted(() => {
  const module = {
    startCoolDown: vi.fn(),
    pauseTimer: vi.fn(),
    resumeTimer: vi.fn(),
    engine: null,
    createBattleEngine: vi.fn(() => {
      const listeners = new Map();
      module.engine = {
        id: Symbol("engine"),
        on: vi.fn((eventName, handler) => {
          if (!listeners.has(eventName)) {
            listeners.set(eventName, new Set());
          }
          listeners.get(eventName).add(handler);
          return () => {
            listeners.get(eventName)?.delete(handler);
          };
        }),
        off: vi.fn((eventName, handler) => {
          listeners.get(eventName)?.delete(handler);
        }),
        emit: (eventName, detail) => {
          for (const handler of listeners.get(eventName) || []) {
            handler(detail);
          }
        },
        listenerCount: (eventName) => (listeners.get(eventName) || new Set()).size
      };
      return module.engine;
    }),
    getEngine: vi.fn(() => module.engine),
    __reset() {
      module.engine = null;
      module.startCoolDown.mockClear();
      module.pauseTimer.mockClear();
      module.resumeTimer.mockClear();
      module.createBattleEngine.mockClear();
      module.getEngine.mockClear();
    }
  };
  return module;
});

vi.mock("../../../src/helpers/classicBattle/orchestrator.js", () => orchestratorMock);
vi.mock("../../../src/helpers/BattleEngine.js", () => battleEngineFacadeMock);

describe("ClassicBattleController.init", () => {
  let fetchMock;
  let originalFetch;
  let originalWindow;
  let windowStub;
  let seededRandom;
  let isTestModeEnabled;
  let getCurrentSeed;
  let setTestMode;
  let featureFlagsEmitter;
  let registeredFlagListeners;

  const registerFlagChangeListeners = (addListenerSpy) => {
    const extractedListeners = (addListenerSpy?.mock?.calls || [])
      .filter(([eventName, handler]) => eventName === "change" && typeof handler === "function")
      .map(([, handler]) => handler);
    registeredFlagListeners.push(...extractedListeners);
    addListenerSpy?.mockRestore?.();
  };

  beforeEach(async () => {
    vi.resetModules();
    orchestratorMock.__reset();
    battleEngineFacadeMock.__reset();
    registeredFlagListeners = [];

    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    originalWindow = globalThis.window;
    windowStub = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    globalThis.window = windowStub;

    ({ seededRandom, isTestModeEnabled, getCurrentSeed, setTestMode } = await import(
      `${helpersPath}/testModeUtils.js`
    ));
    setTestMode(false);

    ({ featureFlagsEmitter } = await import(`${helpersPath}/featureFlags.js`));
  });

  afterEach(() => {
    if (featureFlagsEmitter && registeredFlagListeners.length > 0) {
      for (const listener of registeredFlagListeners) {
        featureFlagsEmitter.removeEventListener("change", listener);
      }
    }
    setTestMode(false);
    registeredFlagListeners = [];

    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }

    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it("enables deterministic RNG once feature flags resolve", async () => {
    const responsePayload = { featureFlags: { enableTestMode: { enabled: true } } };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => responsePayload
    });

    const addListenerSpy = vi.spyOn(featureFlagsEmitter, "addEventListener");
    const { ClassicBattleController } = await import(controllerModule);
    const controller = new ClassicBattleController();

    const initPromise = controller.init();
    expect(isTestModeEnabled()).toBe(false);

    await initPromise;

    registerFlagChangeListeners(addListenerSpy);

    expect(isTestModeEnabled()).toBe(true);
    expect(getCurrentSeed()).toBe(1);
    const deterministic = seededRandom();
    expect(deterministic).toBeCloseTo(0.7098480789645691, 15);
    expect(getCurrentSeed()).toBe(2);
  });

  it("re-syncs deterministic randomness when feature flags toggle", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { enableTestMode: { enabled: false } } })
    });

    const addListenerSpy = vi.spyOn(featureFlagsEmitter, "addEventListener");
    const { ClassicBattleController } = await import(controllerModule);
    const controller = new ClassicBattleController();

    await controller.init();

    registerFlagChangeListeners(addListenerSpy);

    expect(isTestModeEnabled()).toBe(false);
    expect(getCurrentSeed()).toBe(1);

    windowStub.__FF_OVERRIDES = { enableTestMode: true };
    featureFlagsEmitter.dispatchEvent(new Event("change"));

    expect(isTestModeEnabled()).toBe(true);
    const firstDeterministic = seededRandom();
    expect(firstDeterministic).toBeCloseTo(0.7098480789645691, 15);

    windowStub.__FF_OVERRIDES.enableTestMode = false;
    featureFlagsEmitter.dispatchEvent(new Event("change"));
    expect(isTestModeEnabled()).toBe(false);

    windowStub.__FF_OVERRIDES.enableTestMode = true;
    featureFlagsEmitter.dispatchEvent(new Event("change"));

    expect(isTestModeEnabled()).toBe(true);
    const secondDeterministic = seededRandom();
    expect(secondDeterministic).toBeCloseTo(firstDeterministic, 15);
  });

  it("does not multiply listeners when init is called multiple times", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { enableTestMode: { enabled: false } } })
    });

    const addListenerSpy = vi.spyOn(featureFlagsEmitter, "addEventListener");
    const removeListenerSpy = vi.spyOn(featureFlagsEmitter, "removeEventListener");
    const { ClassicBattleController } = await import(controllerModule);
    const controller = new ClassicBattleController();

    await controller.init();
    await controller.init();

    expect(addListenerSpy).toHaveBeenCalledTimes(2);
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    expect(battleEngineFacadeMock.engine.listenerCount("roundStarted")).toBe(1);

    registerFlagChangeListeners(addListenerSpy);
    removeListenerSpy.mockRestore();
  });

  it("dispose removes listeners and prevents subsequent callbacks", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { enableTestMode: { enabled: false } } })
    });

    const addListenerSpy = vi.spyOn(featureFlagsEmitter, "addEventListener");
    const removeListenerSpy = vi.spyOn(featureFlagsEmitter, "removeEventListener");
    const { ClassicBattleController } = await import(controllerModule);
    const controller = new ClassicBattleController();
    const featureFlagCallback = vi.fn();

    controller.addEventListener("featureFlagsChange", featureFlagCallback);
    await controller.init();

    registerFlagChangeListeners(addListenerSpy);
    featureFlagCallback.mockClear();

    controller.dispose();

    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    expect(battleEngineFacadeMock.engine.listenerCount("roundStarted")).toBe(0);

    featureFlagsEmitter.dispatchEvent(new Event("change"));
    battleEngineFacadeMock.engine.emit("roundStarted", { round: 3 });
    expect(featureFlagCallback).not.toHaveBeenCalled();

    removeListenerSpy.mockRestore();
  });
});
