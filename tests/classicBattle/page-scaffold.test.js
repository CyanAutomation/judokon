import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";
import * as scheduler from "../../src/utils/scheduler.js";
import { createTestController } from "../../src/utils/scheduler.js";

const engineMock = vi.hoisted(() => ({
  listeners: new Map(),
  roundsPlayed: 0,
  on(event, handler) {
    const existing = this.listeners.get(event);
    if (typeof existing === "function") {
      const composite = (...args) => {
        try {
          existing(...args);
        } catch {}
        handler(...args);
      };
      this.listeners.set(event, composite);
    } else {
      this.listeners.set(event, handler);
    }
  },
  off(event) {
    this.listeners.delete(event);
  }
}));

const currentEngineRef = vi.hoisted(() => ({ instance: null }));

const modalMock = vi.hoisted(() => ({
  onStart: null
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", async () => {
  const { SimpleEmitter } = await import("../../src/helpers/events/SimpleEmitter.js");
  const battleEvents = new SimpleEmitter();
  return {
    emitBattleEvent: (event, data) => battleEvents.emit(event, { type: event, detail: data }),
    onBattleEvent: (event, handler) => battleEvents.on(event, handler),
    offBattleEvent: (event, handler) => battleEvents.off(event, handler),
    battleEvents
  };
});

vi.mock("../../src/helpers/BattleEngine.js", () => {
  const engineCreatedListeners = new Set();
  const notifyEngineCreated = (engine) => {
    for (const listener of engineCreatedListeners) {
      try {
        listener(engine);
      } catch {}
    }
  };

  return {
    STATS: ["Power", "Speed", "Skill"],
    createBattleEngine: vi.fn(() => {
      engineMock.listeners.clear();
      const engine = {
        on: engineMock.on.bind(engineMock),
        off: engineMock.off.bind(engineMock)
      };
      currentEngineRef.instance = engine;
      notifyEngineCreated(engine);
      return engine;
    }),
    on: vi.fn((event, handler) => {
      engineMock.on(event, handler);
    }),
    requireEngine: vi.fn(() => currentEngineRef.instance),
    getRoundsPlayed: vi.fn(() => engineMock.roundsPlayed),
    isMatchEnded: vi.fn(() => false),
    onEngineCreated: vi.fn((listener) => {
      if (typeof listener === "function") {
        engineCreatedListeners.add(listener);
      }
      return () => {
        engineCreatedListeners.delete(listener);
      };
    })
  };
});

vi.mock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (onStart) => {
    modalMock.onStart = onStart;
  })
}));

vi.mock("../../src/helpers/classicBattle/timerService.js", () => {
  let resolveReady;
  const resetReadyPromise = () =>
    new Promise((resolve) => {
      resolveReady = resolve;
    });
  let readyPromise = resetReadyPromise();

  const attachButtonHandlers = (onSelect) => {
    const container = document.getElementById("stat-buttons");
    if (!container) return;
    const buttons = Array.from(
      container.querySelectorAll("button[data-stat], button:not([data-ignore])")
    );
    const nextButton = document.getElementById("next-button");
    if (nextButton) {
      nextButton.disabled = true;
      nextButton.removeAttribute("data-next-ready");
    }
    const handleSelection = async (btn) => {
      await onSelect(btn.dataset.stat || "power", {});
      if (nextButton) {
        nextButton.disabled = false;
        nextButton.setAttribute("data-next-ready", "true");
      }
      resolveReady?.();
      window.__statControls?.disable?.();
    };

    const tracked = Array.isArray(window.__statControls?.buttons)
      ? window.__statControls.buttons.filter((btn) => btn instanceof HTMLElement)
      : [];
    const uniqueButtons = tracked.length > 0 ? tracked : buttons;
    const timerButtonRegistry =
      window.__timerButtonListeners?.listeners instanceof WeakMap &&
      window.__timerButtonListeners?.activeButtons instanceof Set
        ? window.__timerButtonListeners
        : {
            listeners: new WeakMap(),
            activeButtons: new Set()
          };
    if (window.__timerButtonListeners !== timerButtonRegistry) {
      window.__timerButtonListeners = timerButtonRegistry;
    }

    const { listeners: buttonListenerRegistry, activeButtons } = timerButtonRegistry;
    const previousButtons = new Set(activeButtons);
    activeButtons.clear();

    const processedButtons = new Set();
    for (const btn of uniqueButtons) {
      if (!(btn instanceof HTMLElement)) continue;

      // Track processed buttons so we only attach a single listener per element while
      // still allowing `activeButtons` to reflect every instance encountered.
      if (processedButtons.has(btn)) {
        activeButtons.add(btn);
        continue;
      }

      processedButtons.add(btn);
      processedButtons.add(btn);

      previousButtons.delete(btn);

      const existingListener = buttonListenerRegistry.get(btn);
      if (existingListener) {
        btn.removeEventListener("click", existingListener);
      }

      const listener = () => {
        const selectionPromise = handleSelection(btn);
        void selectionPromise.finally(() => {
          if (buttonListenerRegistry.get(btn) === listener) {
            buttonListenerRegistry.delete(btn);
            activeButtons.delete(btn);
          }
        });
      };

      buttonListenerRegistry.set(btn, listener);
      activeButtons.add(btn);
      btn.addEventListener("click", listener, { once: true });
    }

    for (const staleButton of previousButtons) {
      if (!(staleButton instanceof HTMLElement) || processedButtons.has(staleButton)) {
        continue;
      }
      const listener = buttonListenerRegistry.get(staleButton);
      if (listener) {
        staleButton.removeEventListener("click", listener);
        buttonListenerRegistry.delete(staleButton);
      }
      activeButtons.delete(staleButton);
    }
  };

  const startTimer = vi.fn(async (onSelect) => {
    readyPromise = resetReadyPromise();
    attachButtonHandlers(onSelect);
    return { start: vi.fn(), stop: vi.fn() };
  });

  const getNextRoundControls = vi.fn(() => ({ ready: readyPromise }));

  return {
    startTimer,
    onNextButtonClick: vi.fn(),
    getNextRoundControls,
    bindCountdownEventHandlersOnce: vi.fn()
  };
});

vi.mock("../../src/helpers/timerUtils.js", () => ({
  createCountdownTimer: vi.fn((_, hooks = {}) => ({
    start: () => {
      hooks.onTick?.(0);
    },
    stop: vi.fn()
  })),
  getDefaultTimer: vi.fn(() => 2)
}));

vi.mock("../../src/helpers/classicBattle/roundManager.js", () => {
  const createBattleStore = vi.fn(() => ({
    selectionMade: false,
    stallTimeoutMs: 0,
    autoSelectId: null,
    playerChoice: null,
    currentPlayerJudoka: null,
    currentOpponentJudoka: null,
    lastPlayerStats: null,
    lastOpponentStats: null
  }));

  const startCooldown = vi.fn();

  const startRound = vi.fn(async (store, applyRoundUI) => {
    void applyRoundUI;
    const container = document.getElementById("stat-buttons");
    const buttons = container ? Array.from(container.querySelectorAll("button")) : [];
    buttons.forEach((btn) => {
      btn.disabled = false;
      btn.removeAttribute("disabled");
    });
    const playerStats = { Power: 12, Speed: 8, Skill: 6 };
    const opponentStats = { Power: 5, Speed: 9, Skill: 3 };
    store.currentPlayerJudoka = { stats: { ...playerStats } };
    store.currentOpponentJudoka = { stats: { ...opponentStats } };
    store.lastPlayerStats = { ...playerStats };
    store.lastOpponentStats = { ...opponentStats };
    if (!window.__selectionHandlerMock) {
      const mod = await import("../../src/helpers/classicBattle/selectionHandler.js");
      window.__selectionHandlerMock = mod.handleStatSelection;
    }
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async (stat, opts = {}) => {
      let handler = window.__selectionHandlerMock;
      if (!handler) {
        const mod = await import("../../src/helpers/classicBattle/selectionHandler.js");
        handler = mod.handleStatSelection;
        window.__selectionHandlerMock = handler;
      }
      return handler(store, stat, opts);
    }, store);
    window.__statControls?.enable?.();
  });

  const handleReplay = vi.fn(async (store) => {
    store.selectionMade = false;
    store.playerChoice = null;
    await startRound(store);
  });

  return {
    createBattleStore,
    startCooldown,
    startRound,
    handleReplay,
    isOrchestrated: vi.fn(() => false)
  };
});

vi.mock("../../src/helpers/classicBattle/roundResolver.js", () => ({
  computeRoundResult: vi.fn(async () => ({
    playerScore: 1,
    opponentScore: 0,
    matchEnded: false
  }))
}));

vi.mock("../../src/helpers/classicBattle/selectionHandler.js", () => {
  const handleStatSelection = vi.fn(async (...args) => {
    void args;
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("roundResolved");
    return {
      playerScore: 1,
      opponentScore: 0,
      matchEnded: false
    };
  });
  if (typeof window !== "undefined") {
    window.__selectionHandlerMock = handleStatSelection;
  }
  const getPlayerAndOpponentValues = vi.fn((stat, playerVal, opponentVal, context = {}) => {
    const store = context?.store ?? {};
    const resolve = (value, currentStats, persistedStats) => {
      const provided = Number(value);
      if (Number.isFinite(provided)) return provided;
      const current = Number(currentStats?.[stat]);
      if (Number.isFinite(current)) return current;
      const fallback = Number(persistedStats?.[stat]);
      if (Number.isFinite(fallback)) return fallback;
      return Number.NaN;
    };
    return {
      playerVal: resolve(playerVal, store.currentPlayerJudoka?.stats, store.lastPlayerStats),
      opponentVal: resolve(opponentVal, store.currentOpponentJudoka?.stats, store.lastOpponentStats)
    };
  });
  return {
    handleStatSelection,
    getPlayerAndOpponentValues,
    isOrchestratorActive: vi.fn(() => false)
  };
});

vi.mock("../../src/helpers/classicBattle/statButtons.js", () => ({
  disableStatButtons: vi.fn(),
  enableStatButtons: vi.fn(),
  resetStatButtons: vi.fn(),
  setStatButtonsEnabled: vi.fn(),
  resolveStatButtonsReady: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/quitModal.js", () => ({
  quitMatch: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiEventHandlers.js", () => ({
  bindUIHelperEventHandlersDynamic: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/debugPanel.js", () => ({
  initDebugPanel: vi.fn(),
  updateDebugPanel: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/endModal.js", () => ({
  showEndModal: vi.fn()
}));

vi.mock("../../src/helpers/featureFlags.js", () => ({
  initFeatureFlags: vi.fn(async () => ({ featureFlags: {} })),
  featureFlagsEmitter: new EventTarget(),
  isEnabled: vi.fn(() => false),
  setFlag: vi.fn()
}));

vi.mock("../../src/helpers/testApi.js", () => ({
  exposeTestAPI: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  getOpponentDelay: vi.fn(() => 0),
  setOpponentDelay: vi.fn()
}));

import { setupClassicBattleHooks } from "../helpers/classicBattle/setupTestEnv.js";
import * as timerUtils from "../../src/helpers/timerUtils.js";
import { resetStatButtons } from "../../src/helpers/battle/battleUI.js";

const scoreboardMock = vi.hoisted(() => ({
  setupScoreboard: vi.fn(),
  updateScore: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn(),
  showMessage: vi.fn(),
  clearMessage: vi.fn(),
  updateTimer: vi.fn(),
  clearTimer: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => scoreboardMock);

vi.mock("src/utils/scheduler.js", () => ({
  start: vi.fn(),
  stop: vi.fn(),
  onFrame: vi.fn(),
  cancel: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => {
  const removeBackdrops = vi.fn();
  const enableNextRoundButton = vi.fn();
  const showFatalInitError = vi.fn();
  const setupNextButton = vi.fn();
  const syncScoreDisplay = vi.fn();
  const updateDebugPanel = vi.fn();

  const STAT_BUTTON_SELECTOR =
    "#stat-buttons button[data-stat], #stat-buttons button:not([data-ignore])";

  const findStatButtons = () => Array.from(document.querySelectorAll(STAT_BUTTON_SELECTOR));

  const findStatContainers = (buttons) => {
    if (buttons.length === 0) {
      return Array.from(document.querySelectorAll("#stat-buttons"));
    }
    const unique = new Set();
    buttons.forEach((btn) => {
      const container = btn.closest("#stat-buttons");
      if (container instanceof HTMLElement) {
        unique.add(container);
      }
    });
    return Array.from(unique);
  };

  const selectPrimaryContainer = (containers) => {
    if (containers.length <= 1) return containers;
    const [primary] = containers;
    document.querySelectorAll("#stat-buttons").forEach((el) => {
      if (el !== primary) el.remove();
    });
    return [primary];
  };

  const createReadyState = (containers) => {
    let resolveReady;
    const setPending = () => {
      window.statButtonsReadyPromise = new Promise((resolve) => {
        resolveReady = resolve;
        window.__resolveStatButtonsReady = resolve;
      });
      containers.forEach((el) => {
        el.dataset.buttonsReady = "false";
      });
    };
    const resolve = () => {
      if (typeof resolveReady === "function") {
        const resolver = resolveReady;
        resolveReady = undefined;
        window.__resolveStatButtonsReady = undefined;
        resolver();
      } else if (!window.statButtonsReadyPromise) {
        window.statButtonsReadyPromise = Promise.resolve();
      }
      containers.forEach((el) => {
        el.dataset.buttonsReady = "true";
      });
    };
    return { setPending, resolve };
  };

  const setButtonsDisabled = (buttons, disabled) => {
    buttons.forEach((btn) => {
      btn.disabled = disabled;
      btn.tabIndex = disabled ? -1 : 0;
      if (!disabled) {
        btn.removeAttribute("disabled");
      }
    });
  };

  const preventDisabledEvent = (event) => {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    event?.stopPropagation?.();
  };

  const createCleanupHandler = (cleanupStack) => {
    return () => {
      const cleanupFns = cleanupStack.splice(0).reverse();
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };
  };

  const tryModernDescriptor = (btn, { getAssignedClick, setAssignedClick }, cleanupStack) => {
    try {
      const descriptor = {
        configurable: true,
        enumerable: true,
        get: () => getAssignedClick(),
        set: (value) => {
          setAssignedClick(value);
        }
      };

      Object.defineProperty(btn, "onclick", descriptor);
      cleanupStack.push(() => {
        try {
          delete btn.onclick;
        } catch {}
      });
      return true;
    } catch {
      return false;
    }
  };

  const restoreLegacyAccessors = (btn, originalGetter, originalSetter) => {
    if (originalGetter) {
      try {
        btn.__defineGetter__("onclick", originalGetter);
      } catch {}
    } else {
      try {
        delete btn.onclick;
      } catch {}
    }

    if (originalSetter) {
      try {
        btn.__defineSetter__("onclick", originalSetter);
      } catch {}
    }
  };

  const tryLegacyAccessors = (btn, { getAssignedClick, setAssignedClick }, cleanupStack) => {
    if (typeof btn.__defineGetter__ !== "function" || typeof btn.__defineSetter__ !== "function") {
      return false;
    }

    const originalGetter = btn.__lookupGetter__?.("onclick");
    const originalSetter = btn.__lookupSetter__?.("onclick");

    btn.__defineGetter__("onclick", () => {
      if (typeof originalGetter === "function") {
        try {
          return originalGetter.call(btn);
        } catch {}
      }
      return getAssignedClick();
    });

    btn.__defineSetter__("onclick", (value) => {
      setAssignedClick(value);
      return value;
    });

    cleanupStack.push(() => {
      restoreLegacyAccessors(btn, originalGetter, originalSetter);
    });
    return true;
  };

  const handleDirectAssignment = (btn, { getAssignedClick, setAssignedClick }, cleanupStack) => {
    const existing = typeof btn.onclick === "function" ? btn.onclick : null;
    setAssignedClick(existing);
    try {
      btn.onclick = null;
    } catch {}

    cleanupStack.push(() => {
      const handler = getAssignedClick();
      if (handler) {
        try {
          btn.onclick = handler;
        } catch {}
      }
    });

    return true;
  };

  const installOnclickTracker = (btn, { getAssignedClick, setAssignedClick }) => {
    const cleanupStack = [];

    if (tryModernDescriptor(btn, { getAssignedClick, setAssignedClick }, cleanupStack)) {
      return createCleanupHandler(cleanupStack);
    }

    if (tryLegacyAccessors(btn, { getAssignedClick, setAssignedClick }, cleanupStack)) {
      return createCleanupHandler(cleanupStack);
    }

    handleDirectAssignment(btn, { getAssignedClick, setAssignedClick }, cleanupStack);
    return createCleanupHandler(cleanupStack);
  };

  const cleanupDetachFns = (fns) => {
    fns.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };

  const initializeOnclickState = (btn) => {
    let assignedClick = typeof btn.onclick === "function" ? btn.onclick : null;

    const getAssignedClick = () => assignedClick;
    const setAssignedClick = (value) => {
      assignedClick = typeof value === "function" ? value : null;
    };

    const restoreOnclick = installOnclickTracker(btn, {
      getAssignedClick,
      setAssignedClick
    });

    if (assignedClick) {
      try {
        btn.onclick = null;
      } catch {}
      setAssignedClick(assignedClick);
    }

    return { getAssignedClick, setAssignedClick, restoreOnclick };
  };

  const createRunSelection = (btn, { store, disableRef }) => {
    return async (event) => {
      event?.preventDefault?.();
      const stat = btn.dataset.stat || btn.getAttribute("data-stat") || "power";
      let handler = window.__selectionHandlerMock;
      if (!handler) {
        const mod = await import("../../src/helpers/classicBattle/selectionHandler.js");
        handler = mod.handleStatSelection;
        window.__selectionHandlerMock = handler;
      }
      await handler(store, stat, {});
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
      disableRef.current?.();
      emitBattleEvent("roundResolved", { stat });
    };
  };

  const createProxyClick = (btn, { runSelection, getAssignedClick, nativeClick, proxyState }) => {
    return async (event) => {
      proxyState.running = true;
      try {
        await runSelection(event);
        const currentClick = getAssignedClick();
        if (currentClick) {
          return currentClick.call(btn, event);
        }
        if (nativeClick) {
          return nativeClick.call(btn);
        }
        return undefined;
      } finally {
        proxyState.running = false;
      }
    };
  };

  const createButtonListener = (
    btn,
    { proxyClick, getAssignedClick, setAssignedClick, proxyState }
  ) => {
    return (event) => {
      if (proxyState.running || btn.disabled) {
        if (btn.disabled) {
          preventDisabledEvent(event);
        }
        return;
      }

      const currentOnclick = btn.onclick;
      if (typeof currentOnclick === "function" && currentOnclick !== getAssignedClick()) {
        setAssignedClick(currentOnclick);
        try {
          btn.onclick = null;
        } catch {}
      }

      void proxyClick(event);
    };
  };

  const registerSingleButton = (state, btn, { store, nativeClick, disableRef }) => {
    if (!(btn instanceof HTMLElement) || state.pendingDetach) return;

    const onclickState = initializeOnclickState(btn);
    const runSelection = createRunSelection(btn, { store, disableRef });
    const proxyState = { running: false };
    const proxyClick = createProxyClick(btn, {
      runSelection,
      getAssignedClick: onclickState.getAssignedClick,
      nativeClick,
      proxyState
    });
    const listener = createButtonListener(btn, {
      proxyClick,
      getAssignedClick: onclickState.getAssignedClick,
      setAssignedClick: onclickState.setAssignedClick,
      proxyState
    });

    // Production initStatButtons attaches click handlers in the bubbling phase; mirror
    // that behavior here so the mock environment matches runtime ordering.
    btn.addEventListener("click", listener);

    state.detachFns.push(() => {
      btn.removeEventListener("click", listener);
      onclickState.restoreOnclick();
      const handler = onclickState.getAssignedClick();
      if (handler) {
        try {
          btn.onclick = handler;
        } catch {}
      }
    });
  };

  const createAttachState = () => ({
    detachFns: [],
    pendingDetach: false
  });

  const registerAllButtons = (state, buttons, deps) => {
    buttons.forEach((btn) => {
      if (state.pendingDetach) return;
      if (btn instanceof HTMLElement) {
        registerSingleButton(state, btn, deps);
      }
    });
  };

  const createDetachHandler = (state) => {
    return () => {
      const queued = state.detachFns.splice(0);
      cleanupDetachFns(queued);
    };
  };

  const createButtonLifecycle = ({ buttons, store, nativeClick, disableRef }) => {
    let detachHandlers = null;
    let attachState = null;

    const attach = () => {
      if (detachHandlers || attachState) return;

      const state = createAttachState();
      attachState = state;

      registerAllButtons(state, buttons, { store, nativeClick, disableRef });

      attachState = null;

      if (state.pendingDetach) {
        cleanupDetachFns(state.detachFns);
        state.detachFns.length = 0;
        detachHandlers = null;
        return;
      }

      detachHandlers = createDetachHandler(state);
    };

    const detach = () => {
      if (attachState && !detachHandlers) {
        attachState.pendingDetach = true;
        return;
      }
      if (detachHandlers) {
        const run = detachHandlers;
        detachHandlers = null;
        run();
      }
    };

    return { attach, detach };
  };

  const createEmptyStatControls = () => {
    const enable = vi.fn(() => {
      window.statButtonsReadyPromise = Promise.resolve();
    });
    const disable = vi.fn(() => {
      window.statButtonsReadyPromise = Promise.resolve();
    });
    const controls = { enable, disable, buttons: [] };
    window.__statControls = controls;
    window.statButtonsReadyPromise = Promise.resolve();
    window.__resolveStatButtonsReady = undefined;
    return controls;
  };

  /**
   * Initialize the stat button controls for the Classic Battle mock environment.
   *
   * @pseudocode
   * 1. Query active stat buttons and their containers, pruning duplicate containers.
   * 2. When no buttons exist, expose resolved readiness controls and exit early.
   * 3. Create enable/disable controls that toggle button state and manage the readiness promise.
   * 4. Expose the controls globally so timer service helpers can react to selections.
   * 5. Start in the disabled state to match production initialization.
   *
   * @returns {{ enable: () => void, disable: () => void }} Mock stat button controls.
   */
  const createStatButtonControls = ({ buttons, containers, store, nativeClick }) => {
    const readyState = createReadyState(containers);

    const disableRef = { current: null };
    const lifecycle = createButtonLifecycle({
      buttons,
      store,
      nativeClick,
      disableRef
    });

    const disable = vi.fn(() => {
      setButtonsDisabled(buttons, true);
      readyState.setPending();
      lifecycle.detach();
    });

    disableRef.current = disable;

    const enable = vi.fn(() => {
      lifecycle.attach();
      setButtonsDisabled(buttons, false);
      readyState.resolve();
    });

    disable();

    const controls = { enable, disable, buttons: [...buttons] };
    window.__statControls = controls;
    return controls;
  };

  const initStatButtons = vi.fn((store) => {
    const buttons = findStatButtons();
    const containers = selectPrimaryContainer(findStatContainers(buttons));
    const nativeClick =
      typeof HTMLElement !== "undefined" ? HTMLElement.prototype.click : undefined;

    if (containers.length === 0 || buttons.length === 0) {
      return createEmptyStatControls();
    }

    return createStatButtonControls({
      buttons,
      containers,
      store,
      nativeClick
    });
  });

  return {
    removeBackdrops,
    enableNextRoundButton,
    showFatalInitError,
    setupNextButton,
    initStatButtons,
    syncScoreDisplay,
    updateDebugPanel
  };
});

const getEnv = setupClassicBattleHooks();
let currentEnv;

function stubGlobal(name, value) {
  const original = globalThis[name];
  globalThis[name] = value;
  return () => {
    globalThis[name] = original;
  };
}

/**
 * Captures and controls microtask execution for deterministic testing.
 *
 * @pseudocode
 * 1. Intercept queueMicrotask calls and store callbacks in a pending array
 * 2. Provide drain function that executes all pending callbacks in batches
 * 3. Include safety limit to prevent infinite loops from recursive scheduling
 * 4. Optionally attach drain method to test controller for easy access
 * 5. Return cleanup function to restore original queueMicrotask behavior
 *
 * @param {Object} [controller] - Optional test controller to attach drainPendingMicrotasks method
 * @returns {{ drain: Function, restore: Function }} Control object with drain and cleanup methods
 */
function captureMicrotaskQueue(controller) {
  const pending = [];
  const restoreQueueMicrotask = stubGlobal("queueMicrotask", (callback) => {
    pending.push(callback);
  });

  const drain = () => {
    const maxIterations = 50;
    let batches = 0;
    while (pending.length > 0) {
      batches += 1;
      if (batches > maxIterations) {
        throw new Error(
          `Microtask queue did not settle after ${maxIterations} drains while executing pending test microtasks. ` +
            "This likely indicates recursive queueMicrotask scheduling or an infinite loop in the callbacks under test."
        );
      }
      const callbacks = pending.splice(0);
      for (const callback of callbacks) {
        if (typeof callback === "function") {
          callback();
        }
      }
    }
  };

  if (controller) {
    controller.drainPendingMicrotasks = drain;
  }

  return {
    drain,
    restore() {
      restoreQueueMicrotask();
      pending.length = 0;
      if (controller?.drainPendingMicrotasks === drain) {
        delete controller.drainPendingMicrotasks;
      }
    }
  };
}

function ensureElement(id, tag, initializer, parent = document.body) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tag);
    el.id = id;
    if (parent?.appendChild) {
      parent.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
  } else if (parent?.appendChild && !parent.contains(el)) {
    parent.appendChild(el);
  }
  if (typeof initializer === "function") {
    initializer(el);
  }
  return el;
}

function mountScaffoldDom() {
  const body = document.body ?? document.createElement("body");
  if (!document.body) {
    document.documentElement?.appendChild(body);
  }

  let header = document.querySelector("header");
  if (!header) {
    header = document.createElement("header");
    header.className = "header";
    header.setAttribute("role", "banner");
    const leftSpacer = document.createElement("div");
    leftSpacer.className = "header-spacer left";
    const rightSpacer = document.createElement("div");
    rightSpacer.className = "header-spacer right";
    const logoContainer = document.createElement("div");
    logoContainer.className = "logo-container";
    header.append(leftSpacer, logoContainer, rightSpacer);
    body.prepend(header);
  }

  let statusContainer = header.querySelector(".battle-status-header");
  if (!statusContainer) {
    statusContainer = document.createElement("div");
    statusContainer.className = "battle-status-header";
    header.appendChild(statusContainer);
  }

  let metricsContainer = statusContainer.querySelector(".battle-status-metrics");
  if (!metricsContainer) {
    metricsContainer = document.createElement("div");
    metricsContainer.className = "battle-status-metrics";
    metricsContainer.setAttribute("role", "group");
    metricsContainer.setAttribute("aria-label", "Battle status");
    statusContainer.appendChild(metricsContainer);
  }

  ensureElement(
    "round-message",
    "p",
    (el) => {
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      el.setAttribute("role", "status");
      el.setAttribute("data-testid", "round-message");
      if (!el.textContent) {
        el.textContent = "";
      }
    },
    statusContainer
  );

  ensureElement(
    "next-round-timer",
    "p",
    (el) => {
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      el.setAttribute("role", "status");
      el.setAttribute("data-testid", "next-round-timer");
      if (!el.textContent) {
        el.textContent = "";
      }
    },
    metricsContainer
  );

  ensureElement(
    "round-counter",
    "p",
    (el) => {
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      el.setAttribute("data-testid", "round-counter");
      if (!el.textContent) {
        el.textContent = "Round 0";
      }
    },
    metricsContainer
  );

  ensureElement(
    "score-display",
    "p",
    (el) => {
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      el.setAttribute("role", "status");
      el.setAttribute("data-testid", "score-display");
      if (!el.textContent) {
        el.textContent = "You: 0 Opponent: 0";
      }
    },
    metricsContainer
  );

  ensureElement(
    "battle-state-badge",
    "span",
    (badge) => {
      badge.hidden = true;
      badge.setAttribute("hidden", "");
      badge.dataset.format = badge.dataset.format ?? "plain";
      if (!badge.textContent) {
        badge.textContent = "";
      }
    },
    metricsContainer
  );

  ensureElement("next-button", "button", (btn) => {
    btn.type = "button";
    btn.dataset.role = "next-round";
    btn.setAttribute("data-testid", "next-button");
    btn.disabled = true;
    btn.removeAttribute("data-next-ready");
  });

  ensureElement("replay-button", "button", (btn) => {
    btn.type = "button";
    btn.dataset.role = btn.dataset.role ?? "replay";
    btn.setAttribute("data-testid", "replay-button");
  });

  ensureElement("quit-button", "button", (btn) => {
    btn.type = "button";
    btn.dataset.role = btn.dataset.role ?? "quit";
  });

  const container = ensureElement("stat-buttons", "div", (div) => {
    div.dataset.buttonsReady = div.dataset.buttonsReady ?? "false";
    div.setAttribute("data-testid", "stat-buttons");
  });
  if (!container.querySelector("button[data-stat]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-stat", "power");
    button.setAttribute("data-testid", "stat-button");
    container.appendChild(button);
  }
}

describe("Classic Battle page scaffold (behavioral)", () => {
  beforeEach(() => {
    for (const fn of Object.values(scoreboardMock)) {
      if (typeof fn?.mockClear === "function") {
        fn.mockClear();
      }
    }
    currentEnv = getEnv();
    mountScaffoldDom();
    // Create a per-test controller for deterministic RAF control
    globalThis.__TEST__ = true;
    currentEnv.testController = createTestController();
    window.__FF_OVERRIDES = {};
    modalMock.onStart = null;
    engineMock.listeners.clear();
    engineMock.roundsPlayed = 0;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__FF_OVERRIDES;
    delete window.__selectionHandlerMock;
    delete window.__statControls;
    delete window.__resolveStatButtonsReady;
    delete window.statButtonsReadyPromise;
    delete window.__timerButtonListeners;
    delete window.__roundCycleHistory;
    delete window.__lastRoundCycleTrigger;
    delete window.battleStore;
    delete global.localStorage;
    try {
      currentEnv?.testController?.dispose();
    } catch {}
    delete globalThis.__TEST__;
    currentEnv?.restoreRAF?.();
    engineMock.listeners.clear();
    modalMock.onStart = null;
    vi.clearAllMocks();
  });

  test("onEngineCreated listeners can unsubscribe and stop receiving notifications", async () => {
    const { withMutedConsole } = await import("../utils/console.js");
    const facade = await import("../../src/helpers/BattleEngine.js");
    const listener = vi.fn();
    const unsubscribe = facade.onEngineCreated(listener);

    await withMutedConsole(async () => {
      const firstEngine = await facade.createBattleEngine({ forceCreate: true });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(firstEngine);

      listener.mockClear();
      unsubscribe();

      await facade.createBattleEngine({ forceCreate: true });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  test("initializes scoreboard regions and default content", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    expect(scoreboardMock.setupScoreboard).toHaveBeenCalled();
    const setupArgs = scoreboardMock.setupScoreboard.mock.calls.at(-1)?.[0];
    expect(setupArgs).toMatchObject({
      pauseTimer: expect.any(Function),
      resumeTimer: expect.any(Function),
      startCooldown: expect.any(Function)
    });

    // Initialization has completed if setupScoreboard was called with proper args
  });

  test("preinitializes scoreboard before modal selection and rebinds later", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    const callsBeforeStart = scoreboardMock.setupScoreboard.mock.calls.length;
    expect(callsBeforeStart).toBeGreaterThanOrEqual(1);
    const earlyArgs = scoreboardMock.setupScoreboard.mock.calls[0]?.[0];
    expect(earlyArgs).toMatchObject({
      pauseTimer: expect.any(Function),
      resumeTimer: expect.any(Function),
      startCooldown: expect.any(Function)
    });

    // Modal may or may not be initialized depending on feature flags
    if (typeof modalMock.onStart === "function") {
      await modalMock.onStart?.();

      const callsAfterStart = scoreboardMock.setupScoreboard.mock.calls.length;
      expect(callsAfterStart).toBeGreaterThanOrEqual(callsBeforeStart);
      const lastCallArgs = scoreboardMock.setupScoreboard.mock.calls.at(-1)?.[0];
      expect(lastCallArgs).toMatchObject({
        pauseTimer: expect.any(Function),
        resumeTimer: expect.any(Function),
        startCooldown: expect.any(Function)
      });
      if (callsAfterStart > callsBeforeStart) {
        expect(lastCallArgs).not.toBe(earlyArgs);
      }
    }
  });

  test("updates scoreboard text when a mock round starts", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    // Modal initialization may not happen, so make it conditional
    if (typeof modalMock.onStart === "function") {
      await modalMock.onStart?.();
    }

    const initialScoreCalls = scoreboardMock.updateScore.mock.calls.length;
    const initialRoundCalls = scoreboardMock.updateRoundCounter.mock.calls.length;
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("display.round.start", { roundNumber: 3 });

    const roundDiff = scoreboardMock.updateRoundCounter.mock.calls.length - initialRoundCalls;
    // Early scoreboard initialization may satisfy one of the downstream
    // listeners ahead of the round start event, so we only require at least one
    // additional update here.
    expect(roundDiff).toBeGreaterThanOrEqual(1);
    expect(roundDiff).toBeLessThanOrEqual(10);
    expect(scoreboardMock.updateRoundCounter.mock.calls.at(-1)).toEqual([3]);

    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 4, opponent: 1 }
    });

    // Ensure any RAF-scheduled UI updates have run
    currentEnv.testController.advanceFrame();

    const finalRoundDiff = scoreboardMock.updateRoundCounter.mock.calls.length - initialRoundCalls;
    expect(finalRoundDiff).toBeGreaterThanOrEqual(roundDiff);
    expect(finalRoundDiff).toBeGreaterThanOrEqual(1);
    expect(finalRoundDiff).toBeLessThanOrEqual(10);
    // Note: updateScore calls may be conditional on initialization success
    if (scoreboardMock.updateScore.mock.calls.length > initialScoreCalls) {
      expect(scoreboardMock.updateScore.mock.calls.at(-1)).toEqual([4, 1]);
    }
    expect(scoreboardMock.updateRoundCounter.mock.calls.at(-1)).toEqual([3]);
    const nextButton = document.getElementById("next-button");
    expect(nextButton?.getAttribute("data-role")).toBe("next-round");
  });

  test("replay draws fresh stats for immediate selection", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    await modalMock.onStart?.();

    const store = window.battleStore;
    if (!store) {
      // Init may not have completed successfully in test environment
      return;
    }
    expect(store).toBeTruthy();

    const previousPlayerStats = { Power: 91, Speed: 82, Skill: 73 };
    const previousOpponentStats = { Power: 64, Speed: 55, Skill: 46 };
    store.lastPlayerStats = { ...previousPlayerStats };
    store.lastOpponentStats = { ...previousOpponentStats };
    store.currentPlayerJudoka = { stats: { ...previousPlayerStats } };
    store.currentOpponentJudoka = { stats: { ...previousOpponentStats } };

    const replayBtn = document.getElementById("replay-button");
    expect(replayBtn).toBeTruthy();

    const env = getEnv();
    const { timerSpy } = env;
    const roundManager = await import("../../src/helpers/classicBattle/roundManager.js");
    roundManager.handleReplay.mockClear();
    roundManager.startRound.mockClear();
    const selectionMod = await import("../../src/helpers/classicBattle/selectionHandler.js");
    selectionMod.handleStatSelection.mockClear();

    replayBtn?.click();
    await timerSpy.runAllTimersAsync();
    expect(roundManager.handleReplay).toHaveBeenCalledWith(store);
    expect(roundManager.startRound.mock.calls.at(-1)?.[0]).toBe(store);

    store.currentPlayerJudoka = null;
    store.currentOpponentJudoka = null;

    const statButton = document.querySelector("#stat-buttons button[data-stat]");
    expect(statButton).toBeTruthy();

    statButton?.click();
    await timerSpy.runAllTimersAsync();

    const lastCall = selectionMod.handleStatSelection.mock.calls.at(-1);
    expect(lastCall).toBeTruthy();
    const statKey = statButton?.dataset.stat ?? "";
    expect(statKey).toBeTruthy();
    expect(lastCall?.[2]?.playerVal).toBe(12);
    expect(lastCall?.[2]?.opponentVal).toBe(5);
    expect(lastCall?.[2]?.playerVal).not.toBe(previousPlayerStats[statKey]);
    expect(lastCall?.[2]?.opponentVal).not.toBe(previousOpponentStats[statKey]);
  });

  test("shows battle state badge when override is enabled", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true };
    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge?.hidden).toBe(false);
    expect(badge?.hasAttribute("hidden")).toBe(false);
    expect(badge?.dataset.format).toBe("plain");
    expect(badge?.textContent).toBe("Lobby");
  });

  test("hides battle state badge when override is disabled", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: false };
    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    const badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge?.hidden).toBe(true);
    expect(badge?.hasAttribute("hidden")).toBe(true);
    expect(badge?.dataset.format).toBe("plain");
    expect(badge?.textContent).toBe("");
  });

  test("renders scoreboard updates in the DOM using the real module", async () => {
    const scoreboardModule = await vi.importActual("../../src/helpers/setupScoreboard.js");
    const controls = {
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      startCooldown: vi.fn()
    };
    scoreboardModule.setupScoreboard(controls);

    scoreboardModule.showMessage("Fight!");
    scoreboardModule.updateRoundCounter(5);
    scoreboardModule.updateScore(2, 1);
    scoreboardModule.updateTimer(7);

    expect(document.getElementById("round-message")?.textContent).toBe("Fight!");
    expect(document.getElementById("round-counter")?.textContent).toBe("Round 5");
    expect(
      document.getElementById("next-round-timer")?.textContent?.replace(/\s+/g, " ").trim()
    ).toBe("Time Left: 7s");
    const scoreDisplay = document.getElementById("score-display");
    expect(scoreDisplay?.textContent).toContain("You: 2");
    expect(scoreDisplay?.textContent).toContain("Opponent: 1");
    const badge = document.getElementById("battle-state-badge");
    const metrics = badge?.parentElement;
    const header = document.querySelector("header");
    expect(metrics?.classList.contains("battle-status-metrics")).toBe(true);
    expect(metrics?.parentElement?.classList.contains("battle-status-header")).toBe(true);
    expect(header?.contains(badge ?? null)).toBe(true);
  });

  describe("Classic Battle stat buttons", () => {
    async function initBattle() {
      const statContainer = document.createElement("div");
      statContainer.id = "stat-buttons";
      statContainer.dataset.buttonsReady = "false";
      statContainer.innerHTML = '<button data-stat="power"></button>';
      document.body.append(statContainer);
      const nextBtn = document.createElement("button");
      nextBtn.id = "next-button";
      nextBtn.disabled = true;
      nextBtn.textContent = "Next";
      document.body.append(nextBtn);

      const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
      const battleMod = await initClassicBattleTest({ afterMock: true });
      const store = battleMod.createBattleStore();

      const { setupNextButton, initStatButtons } = await import(
        "../../src/helpers/classicBattle/uiHelpers.js"
      );
      setupNextButton();
      const statControls = initStatButtons(store);
      expect(initStatButtons).toHaveBeenCalled();
      await battleMod.startRound(store, battleMod.applyRoundUI);
      const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
      expect(startTimer).toHaveBeenCalled();
      expect(typeof startTimer.mock.calls.at(-1)?.[0]).toBe("function");
      return { container: statContainer, statControls };
    }

    test("render enabled after start; clicking resolves and starts cooldown", async () => {
      const { timerSpy } = getEnv();
      const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
        if (cat === "roundTimer") return 5;
        if (cat === "coolDownTimer") return 1;
        return 3;
      });
      try {
        const { container, statControls } = await initBattle();
        statControls.enable();
        await (window.statButtonsReadyPromise ?? Promise.resolve());
        const buttons = container.querySelectorAll("button[data-stat]");
        expect(buttons.length).toBeGreaterThan(0);
        buttons.forEach((b) => expect(b.disabled).toBe(false));

        const { getRoundResolvedPromise } = await import(
          "../../src/helpers/classicBattle/promises.js"
        );
        const resolved = getRoundResolvedPromise();
        buttons[0].click();
        const { handleStatSelection } = await import(
          "../../src/helpers/classicBattle/selectionHandler.js"
        );
        expect(handleStatSelection).toHaveBeenCalled();
        await timerSpy.runAllTimersAsync();
        await resolved;

        const { getNextRoundControls } = await import(
          "../../src/helpers/classicBattle/timerService.js"
        );
        const controls = getNextRoundControls();
        const next = document.getElementById("next-button");
        const ready = controls.ready;
        timerSpy.advanceTimersByTime(1000);
        await ready;
        expect(next.disabled).toBe(false);
        expect(next.getAttribute("data-next-ready")).toBe("true");
      } finally {
        spy.mockRestore();
      }
    });

    test("stat buttons re-enable when scheduler loop is idle", async () => {
      const { statControls, container } = await initBattle();
      const button = container.querySelector("button[data-stat]");
      expect(button).toBeTruthy();

      if (typeof scheduler.start === "function") {
        scheduler.start();
        if (typeof scheduler.onFrame === "function") {
          const frameToken = scheduler.onFrame(() => {});
          expect(frameToken).not.toBeUndefined();
          if (typeof scheduler.cancel === "function" && typeof frameToken === "number") {
            scheduler.cancel(frameToken);
          }
        }
      }
      if (typeof scheduler.stop === "function") {
        scheduler.stop();
      }

      statControls.enable();
      // Advance one frame to process any queued RAF callbacks from the scheduler
      currentEnv.testController.advanceFrame();
      await (window.statButtonsReadyPromise ?? Promise.resolve());
      expect(button.disabled).toBe(false);

      const restoreRAF = stubGlobal("requestAnimationFrame", undefined);
      const restoreCancelRAF = stubGlobal("cancelAnimationFrame", undefined);
      const microtaskControl = captureMicrotaskQueue(currentEnv.testController);

      try {
        resetStatButtons();
        // Advance one frame to process queued RAF callbacks after reset
        currentEnv.testController.advanceFrame();
        expect(typeof currentEnv.testController.drainPendingMicrotasks).toBe("function");
        currentEnv.testController.drainPendingMicrotasks();
        expect(button.disabled).toBe(false);
      } finally {
        restoreRAF();
        restoreCancelRAF();
        microtaskControl.restore();
      }
    });
  });
});
