import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";
import * as scheduler from "../../src/utils/scheduler.js";

const engineMock = vi.hoisted(() => ({
  listeners: new Map(),
  roundsPlayed: 0
}));

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

vi.mock("../../src/helpers/battleEngineFacade.js", () => {
  return {
    STATS: ["Power", "Speed", "Skill"],
    createBattleEngine: vi.fn(() => {
      engineMock.listeners.clear();
      return {};
    }),
    on: vi.fn((event, handler) => {
      engineMock.listeners.set(event, handler);
    }),
    getRoundsPlayed: vi.fn(() => engineMock.roundsPlayed),
    isMatchEnded: vi.fn(() => false)
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
    const seen = new Set();
    uniqueButtons.forEach((btn) => {
      if (!(btn instanceof HTMLElement) || seen.has(btn)) return;
      seen.add(btn);
      const listener = () => {
        void handleSelection(btn);
      };
      btn.addEventListener("click", listener, { once: true });
    });
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
    getNextRoundControls
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
    playerChoice: null
  }));

  const startCooldown = vi.fn();

  const startRound = vi.fn(async (store, applyRoundUI) => {
    const container = document.getElementById("stat-buttons");
    const buttons = container ? Array.from(container.querySelectorAll("button")) : [];
    buttons.forEach((btn) => {
      btn.disabled = false;
      btn.removeAttribute("disabled");
    });
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

  return {
    createBattleStore,
    startCooldown,
    startRound
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
  return { handleStatSelection };
});

vi.mock("../../src/helpers/classicBattle/statButtons.js", () => ({
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
  showSelectionPrompt: vi.fn()
}));

import { setupClassicBattleHooks } from "../helpers/classicBattle/setupTestEnv.js";
import * as timerUtils from "../../src/helpers/timerUtils.js";
import { resetFallbackScores } from "../../src/helpers/api/battleUI.js";
import { resetStatButtons } from "../../src/helpers/battle/battleUI.js";

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
  const initStatButtons = vi.fn((store) => {
    void store;
    const buttons = findStatButtons();
    const containers = selectPrimaryContainer(findStatContainers(buttons));

    if (containers.length === 0 || buttons.length === 0) {
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
    }

    const readyState = createReadyState(containers);

    const disable = vi.fn(() => {
      setButtonsDisabled(buttons, true);
      readyState.setPending();
    });

    const enable = vi.fn(() => {
      setButtonsDisabled(buttons, false);
      readyState.resolve();
    });

    disable();

    const controls = { enable, disable, buttons: [...buttons] };
    window.__statControls = controls;
    return controls;
  });

  return {
    removeBackdrops,
    enableNextRoundButton,
    showFatalInitError,
    setupNextButton,
    initStatButtons
  };
});

let originalRAF;
let originalCAF;

function stubGlobal(name, value) {
  const original = globalThis[name];
  globalThis[name] = value;
  return () => {
    globalThis[name] = original;
  };
}

async function flushImmediateTasks() {
  if (typeof globalThis.queueMicrotask === "function") {
    await new Promise((resolve) => {
      globalThis.queueMicrotask(resolve);
    });
    return;
  }
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("Classic Battle page scaffold (behavioral)", () => {
  beforeEach(() => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;
    window.__FF_OVERRIDES = {};
    originalRAF = global.requestAnimationFrame;
    originalCAF = global.cancelAnimationFrame;
    global.requestAnimationFrame = (cb) => {
      if (typeof cb === "function") cb(0);
      return 1;
    };
    global.cancelAnimationFrame = vi.fn();
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
    document.documentElement.innerHTML = "";
    delete window.__FF_OVERRIDES;
    delete global.localStorage;
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
    engineMock.listeners.clear();
    modalMock.onStart = null;
    vi.resetModules();
    vi.clearAllMocks();
    delete window.__selectionHandlerMock;
    delete window.__statControls;
    delete window.__resolveStatButtonsReady;
    delete window.statButtonsReadyPromise;
  });

  test("initializes scoreboard regions and default content", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    const msg = header.querySelector("#round-message");
    const timer = header.querySelector("#next-round-timer");
    const round = header.querySelector("#round-counter");
    const score = header.querySelector("#score-display");
    expect(msg).toBeTruthy();
    expect(timer).toBeTruthy();
    expect(round).toBeTruthy();
    expect(score).toBeTruthy();

    for (const el of [msg, timer]) {
      expect(el.getAttribute("role")).toBe("status");
      expect(el.getAttribute("aria-live")).toBe("polite");
      expect(el.getAttribute("aria-atomic")).toBe("true");
    }
    expect(score.getAttribute("aria-live")).toBe("off");
    expect(score.getAttribute("aria-atomic")).toBe("true");

    expect(score.textContent).toContain("You: 0");
    expect(score.textContent).toContain("Opponent: 0");
    expect(round.textContent).toContain("Round 0");
  });

  test("updates scoreboard text when a mock round starts", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    expect(typeof modalMock.onStart).toBe("function");

    await modalMock.onStart?.();

    const round = document.querySelector("#round-counter");
    const score = document.querySelector("#score-display");
    expect(round?.textContent).toContain("Round 1");
    expect(score?.textContent).toContain("You: 0");

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("display.round.start", { roundNumber: 3 });

    const roundEnded = engineMock.listeners.get("roundEnded");
    roundEnded?.({ playerScore: 4, opponentScore: 1 });

    expect(round?.textContent).toContain("Round 3");
    expect(score?.textContent).toContain("You: 4");
    expect(score?.textContent).toContain("Opponent: 1");

    const playerSpan = score?.querySelector("[data-side='player']");
    const opponentSpan = score?.querySelector("[data-side='opponent']");
    expect(playerSpan?.textContent).toContain("You: 4");
    expect(opponentSpan?.textContent).toContain("Opponent: 1");
    expect(score?.getAttribute("aria-live")).toBe("off");

    const statButtons = document.querySelectorAll("#stat-buttons button[data-stat]");
    expect(statButtons.length).toBeGreaterThan(0);
    const firstButton = statButtons[0];
    expect(firstButton.getAttribute("type")).toBe("button");
    expect(firstButton.getAttribute("aria-describedby")).toBe("round-message");
    expect(firstButton.getAttribute("data-testid")).toBe("stat-button");

    const nextButton = document.getElementById("next-button");
    expect(nextButton?.getAttribute("data-role")).toBe("next-round");
  });

  test("respects battle state badge feature flag overrides", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true };
    let mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    let badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge?.hidden).toBe(false);
    expect(badge?.hasAttribute("hidden")).toBe(false);
    expect(badge?.dataset.format).toBe("plain");
    expect(badge?.textContent).toBe("Lobby");

    document.documentElement.innerHTML = readFileSync(
      resolve(process.cwd(), "src/pages/battleClassic.html"),
      "utf-8"
    );
    modalMock.onStart = null;
    engineMock.listeners.clear();
    engineMock.roundsPlayed = 0;
    window.__FF_OVERRIDES = { battleStateBadge: false };
    mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge?.hidden).toBe(true);
    expect(badge?.hasAttribute("hidden")).toBe(true);
    expect(badge?.dataset.format).toBe("plain");
  });

  describe("Classic Battle stat buttons", () => {
    const getEnv = setupClassicBattleHooks();

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
      resetFallbackScores();
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
      resetFallbackScores();
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
      // Flush any queued RAF callbacks to process scheduler updates
      if (typeof globalThis.flushRAF === "function") {
        globalThis.flushRAF();
      }
      await (window.statButtonsReadyPromise ?? Promise.resolve());
      expect(button.disabled).toBe(false);

      const restoreRAF = stubGlobal("requestAnimationFrame", undefined);
      const restoreCancelRAF = stubGlobal("cancelAnimationFrame", undefined);

      try {
        resetStatButtons();
        // Flush RAF again after reset
        if (typeof globalThis.flushRAF === "function") {
          globalThis.flushRAF();
        }
        await flushImmediateTasks();
        expect(button.disabled).toBe(false);
      } finally {
        restoreRAF();
        restoreCancelRAF();
      }
    });
  });
});
