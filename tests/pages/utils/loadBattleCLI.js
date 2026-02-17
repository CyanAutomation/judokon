import { vi } from "vitest";

/**
 * Load the Battle CLI page module with common mocks and DOM nodes.
 *
 * @pseudocode
 * 1. Prepare default options and establish DOM skeleton.
 * 2. Stub battle helpers and feature flags with `vi.doMock`.
 * 3. Import the page module after mocks are in place.
 * 4. Return the loaded module for use in tests.
 *
 * @param {Object} [options] - Optional configuration.
 * @param {boolean} [options.verbose=false] - Enable verbose flag.
 * @param {boolean} [options.cliShortcuts=true] - Enable CLI shortcuts flag.
 * @param {boolean} [options.statHotkeys=true] - Enable stat hotkeys flag.
 * @param {number} [options.pointsToWin=5] - Initial target score.
 * @param {boolean} [options.autoSelect=true] - Enable auto-select flag.
 * @param {string} [options.html=""] - Extra HTML to append to the test DOM.
 * @param {string} [options.url] - URL to stub as `location`.
 * @param {Array} [options.stats=[]] - Stat metadata returned by `fetchJson`.
 * @param {Array} [options.battleStats=[]] - Values for `BattleEngine.STATS`.
 * @param {boolean} [options.mockBattleEngine=true] - When true, this helper owns the
 * BattleEngine mock. When false, the caller must supply their own mock (caller-supplied wins).
 * @returns {Promise<import("../../../src/pages/index.js")["battleCLI"]>} Loaded module.
 */
const orchestratorSpies = new Set();

export async function loadBattleCLI(options = {}) {
  const {
    verbose = false,
    cliShortcuts = true,
    statHotkeys = true,
    pointsToWin = 10,
    autoSelect = true,
    html = "",
    url,
    stats = [],
    battleStats = [],
    mockBattleEvents = true,
    mockBattleEngine = true,
    createBattleInstanceFactory = null
  } = options;

  window.__TEST__ = true;
  if (url) {
    vi.stubGlobal("location", new URL(url));
  }

  const emitter = new EventTarget();
  const flagState = {
    cliVerbose: verbose,
    cliShortcuts,
    statHotkeys,
    autoSelect,
    skipRoundCooldown: false
  };
  const initFeatureFlags = vi.fn().mockResolvedValue({
    featureFlags: {
      cliVerbose: { enabled: flagState.cliVerbose },
      cliShortcuts: { enabled: flagState.cliShortcuts },
      statHotkeys: { enabled: flagState.statHotkeys },
      autoSelect: { enabled: flagState.autoSelect }
    }
  });
  const isEnabled = vi.fn((flag) => {
    if (flag in flagState) {
      return flagState[flag];
    }
    return false;
  });
  const setFlag = vi.fn((flag, value) => {
    if (flag in flagState) {
      flagState[flag] = value;
    }
    emitter.dispatchEvent(
      new CustomEvent("change", {
        detail: { flag, value }
      })
    );
  });
  /**
   * Set a mock flag without emitting change events.
   * Use for test setup; prefer setFlag() to simulate user interactions.
   *
   * @param {string} flag - The flag name to set.
   * @param {boolean} value - The desired flag value.
   */
  const setMockFlag = (flag, value) => {
    if (flag in flagState) {
      flagState[flag] = value;
    }
  };

  vi.doMock("../../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags,
    isEnabled,
    setFlag,
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn(),
    resetGame: vi.fn()
  }));
  const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
  const ensureMock = (method, implementation) => {
    const target = orchestrator[method];
    if (typeof target !== "function") {
      throw new TypeError(
        `Expected orchestrator.${method} to be a function, but got ${typeof target}`
      );
    }
    if (!("mock" in target)) {
      vi.spyOn(orchestrator, method);
    }
    const spy = orchestrator[method];
    orchestratorSpies.add(spy);
    spy.mockReset();
    if (implementation) {
      spy.mockImplementation(implementation);
    }
    return spy;
  };
  ensureMock("initClassicBattleOrchestrator", () => Promise.resolve());
  ensureMock("dispatchBattleEvent", () => Promise.resolve(true));
  if (mockBattleEvents) {
    // Provide a functional in-memory event bus for battle events so the page
    // can react to emitted events in tests (focus, countdown, etc.).
    const battleBus = new EventTarget();
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => {
      const onBattleEvent = vi.fn((type, handler) => {
        try {
          battleBus.addEventListener(type, handler);
        } catch {}
      });
      const offBattleEvent = vi.fn((type, handler) => {
        try {
          battleBus.removeEventListener(type, handler);
        } catch {}
      });
      const emitBattleEvent = vi.fn((type, detail) => {
        try {
          battleBus.dispatchEvent(new CustomEvent(type, { detail }));
        } catch {}
      });
      const getBattleEventTarget = vi.fn(() => battleBus);
      const createBattleEventBus = vi.fn(() => ({
        target: battleBus,
        on: (type, handler) => onBattleEvent(type, handler),
        off: (type, handler) => offBattleEvent(type, handler),
        emit: (type, detail) => emitBattleEvent(type, detail),
        emitWithAliases: (type, detail) => emitBattleEvent(type, detail),
        getTarget: () => battleBus,
        resetDedupeState: () => {},
        dispose: vi.fn()
      }));
      const __resetBattleEventTarget = vi.fn(() => {});
      const resetBattleEventDedupeState = vi.fn();
      const setActiveBattleEventBus = vi.fn();
      const getActiveBattleEventBus = vi.fn(() => createBattleEventBus());
      return {
        createBattleEventBus,
        setActiveBattleEventBus,
        getActiveBattleEventBus,
        onBattleEvent,
        offBattleEvent,
        emitBattleEvent,
        getBattleEventTarget,
        __resetBattleEventTarget,
        resetBattleEventDedupeState
      };
    });
  }

  if (typeof createBattleInstanceFactory === "function") {
    vi.doMock("../../../src/helpers/classicBattle/createBattleInstance.js", () => ({
      createBattleInstance: createBattleInstanceFactory
    }));
  }
  if (mockBattleEngine === true) {
    // Helper-owned mock: provides base BattleEngine stub for CLI page tests.
    let pts = pointsToWin;
    const baseBattleEngineMock = { STATS: battleStats };
    vi.doMock("../../../src/helpers/BattleEngine.js", () => ({
      ...baseBattleEngineMock,
      setPointsToWin: vi.fn((v) => {
        pts = v;
      }),
      getPointsToWin: vi.fn(() => pts),
      getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 })),
      stopTimer: vi.fn()
    }));
  }
  vi.doMock("../../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue(stats)
  }));
  vi.doMock("../../../src/helpers/constants.js", () => ({
    DATA_DIR: "",
    // Provide defaults used by the CLI UI
    SNACKBAR_REMOVE_MS: 3000,
    SNACKBAR_FADE_MS: 2500
  }));
  vi.doMock("../../../src/helpers/classicBattle/autoSelectStat.js", () => {
    const autoSelectStat = vi.fn(async () => {
      const markerId = "auto-select-marker";
      let marker = document.getElementById(markerId);
      if (!marker) {
        marker = document.createElement("div");
        marker.id = markerId;
        marker.dataset.triggerCount = "0";
        document.body.appendChild(marker);
      }
      const nextCount = Number(marker.dataset.triggerCount || "0") + 1;
      marker.dataset.triggerCount = String(nextCount);
      marker.textContent = `auto-select:${nextCount}`;
    });
    return {
      autoSelectStat
    };
  });
  vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
    skipRoundCooldownIfEnabled: vi.fn(),
    updateBattleStateBadge: vi.fn()
  }));
  vi.doMock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
    resolveRoundStartPolicy: vi.fn().mockRejectedValue(new Error("Modal init failed"))
  }));
  const showSnackbar = vi.fn();
  vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
    showSnackbar
  }));
  {
    let __autoContinue = true;
    vi.doMock("../../../src/helpers/classicBattle/orchestratorHandlers.js", () => ({
      setAutoContinue: vi.fn((v) => {
        __autoContinue = v !== false;
      }),
      getAutoContinue: vi.fn(() => __autoContinue),
      get autoContinue() {
        return __autoContinue;
      }
    }));
  }

  const mod = await import("../../../src/pages/index.js");
  const cli = mod.battleCLI;
  cli.ensureCliDomForTest({ reset: true });
  if (html) {
    document.body.insertAdjacentHTML("beforeend", html);
  }
  return Object.assign(cli, {
    featureFlagsEmitter: emitter,
    setMockFlag
  });
}

/**
 * Clean up DOM and mocks after a Battle CLI test.
 *
 * @pseudocode
 * 1. Clear DOM and globals.
 * 2. Remove mocks and restore vitest state.
 * 3. Invoke battle test hooks to reset modules.
 *
 * @returns {Promise<void>} resolves when cleanup completes.
 */
export async function cleanupBattleCLI() {
  // Reset module-level state in init.js (selectionApplying, timers, etc.)
  try {
    const initMod = await import("../../../src/pages/battleCLI/init.js");
    initMod.unwireEvents?.();
    await initMod.resetMatch?.();
  } catch {}

  document.body.innerHTML = "";
  delete window.__TEST__;
  vi.clearAllMocks();
  orchestratorSpies.forEach((spy) => {
    if (spy && typeof spy.mockRestore === "function") {
      spy.mockRestore();
    }
  });
  orchestratorSpies.clear();
  vi.unstubAllGlobals();
  localStorage.clear();
  const mocked = [
    "../../../src/helpers/featureFlags.js",
    "../../../src/helpers/classicBattle/roundManager.js",
    "../../../src/helpers/classicBattle/orchestrator.js",
    "../../../src/helpers/classicBattle/battleEvents.js",

    "../../../src/helpers/BattleEngine.js",
    "../../../src/helpers/BattleEngine.js",
    "../../../src/helpers/dataUtils.js",
    "../../../src/helpers/constants.js",
    "../../../src/helpers/classicBattle/autoSelectStat.js",
    "../../../src/helpers/classicBattle/uiHelpers.js",
    "../../../src/helpers/classicBattle/orchestratorHandlers.js",
    "../../../src/helpers/classicBattle/roundSelectModal.js",
    "../../../src/helpers/showSnackbar.js"
  ];
  mocked.forEach((m) => vi.doUnmock(m));
  // Reset modules to ensure fresh imports on next loadBattleCLI call
  vi.resetModules();
  try {
    const { __resetClassicBattleBindings } = await import("../../../src/helpers/classicBattle.js");
    __resetClassicBattleBindings();
  } catch {}
  try {
    const { __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    __resetBattleEventTarget();
  } catch {}
}
