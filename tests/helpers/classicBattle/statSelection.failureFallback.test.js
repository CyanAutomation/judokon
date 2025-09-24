import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestController } from "../../../src/utils/scheduler.js";
import { withListenerSpy } from "../listenerUtils.js";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { onBattleEvent, offBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";

// Enable test controller access
globalThis.__TEST__ = true;

describe("classicBattle stat selection failure recovery", () => {
  const ROUND_MANAGER_PATH = "../../../src/helpers/classicBattle/roundManager.js";
  const SELECTION_HANDLER_PATH = "../../../src/helpers/classicBattle/selectionHandler.js";
  const UI_HELPERS_PATH = "../../../src/helpers/classicBattle/uiHelpers.js";
  let renderStatButtons;
  let startCooldownMock;
  let handleStatSelectionMock;
  let showSnackbarMock;
  let enableNextRoundButtonMock;
  let disableNextRoundButtonMock;
  let previousMinDuration;
  let originalLocalStorage;
  let testController;

  /**
   * Flush pending microtasks to ensure async operations complete
   * @returns {Promise<void>}
   */
  const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(async () => {
    vi.resetModules();
    startCooldownMock = vi.fn();
    handleStatSelectionMock = vi.fn();
    showSnackbarMock = vi.fn();
    enableNextRoundButtonMock = vi.fn();
    disableNextRoundButtonMock = vi.fn();

    vi.doMock(ROUND_MANAGER_PATH, () => ({
      startCooldown: startCooldownMock,
      createBattleStore: vi.fn(() => ({ __uiCooldownStarted: false }))
    }));

    vi.doMock(SELECTION_HANDLER_PATH, () => ({
      handleStatSelection: handleStatSelectionMock,
      getPlayerAndOpponentValues: vi.fn(() => ({ playerVal: 5, opponentVal: 3 }))
    }));

    vi.doMock(UI_HELPERS_PATH, () => ({
      enableNextRoundButton: enableNextRoundButtonMock,
      disableNextRoundButton: disableNextRoundButtonMock,
      removeBackdrops: vi.fn(),
      showFatalInitError: vi.fn()
    }));

    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: (...args) => showSnackbarMock(...args),
      updateSnackbar: vi.fn()
    }));

    vi.doMock("../../../src/helpers/i18n.js", () => ({
      t: (key) => (key === "ui.opponentChoosing" ? "Opponent is choosing…" : key)
    }));

    // Create test controller for deterministic RAF control
    testController = createTestController();

    originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };

    const w = globalThis.window || (globalThis.window = {});
    previousMinDuration = w.__MIN_OPPONENT_MESSAGE_DURATION_MS;
    w.__MIN_OPPONENT_MESSAGE_DURATION_MS = 200;

    ({ renderStatButtons } = await import("../../../src/pages/battleClassic.init.js"));
  });

  afterEach(() => {
    document.body.innerHTML = "";
    try {
      testController?.dispose();
    } catch {}
    vi.useRealTimers();
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
    const w = globalThis.window;
    if (w) {
      if (typeof previousMinDuration === "undefined") {
        delete w.__MIN_OPPONENT_MESSAGE_DURATION_MS;
      } else {
        w.__MIN_OPPONENT_MESSAGE_DURATION_MS = previousMinDuration;
      }
    }
    vi.clearAllMocks();
    vi.resetModules();
    testController = undefined;
  });

  it("starts cooldown, resets cooldown flag, and marks Next ready when selection handler rejects", async () => {
    handleStatSelectionMock.mockImplementation(() => {
      throw new Error("stat selection failed");
    });

    document.body.innerHTML = `<div id="stat-buttons"></div>`;

    const store = {};
    renderStatButtons(store);

    const statButton = document.querySelector("[data-stat]");
    await withListenerSpy(statButton, "click", async (calls) => {
      statButton.click();

      expect(calls).toHaveLength(1);
      expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
      expect(handleStatSelectionMock).toHaveBeenCalledWith(
        store,
        expect.any(String),
        expect.objectContaining({ playerVal: 5, opponentVal: 3 })
      );
      expect(startCooldownMock).toHaveBeenCalledTimes(1);
      expect(startCooldownMock).toHaveBeenCalledWith(store);
      expect(store.__uiCooldownStarted).toBe(false);
      expect(enableNextRoundButtonMock).toHaveBeenCalled();
    });
  });

  it("immediately triggers cooldown on selection failure without advancing timers", async () => {
    const { cleanup } = useCanonicalTimers();
    try {
      handleStatSelectionMock.mockImplementation(() => {
        throw new Error("stat selection failed");
      });

      document.body.innerHTML = `<div id="stat-buttons"></div>`;

      const store = {};
      renderStatButtons(store);

      const statButton = document.querySelector("[data-stat]");
      await withListenerSpy(statButton, "click", async (calls) => {
        statButton.click();

        expect(calls).toHaveLength(1);
        expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
        expect(startCooldownMock).toHaveBeenCalledTimes(1);
        expect(startCooldownMock).toHaveBeenCalledWith(store);
        expect(store.__uiCooldownStarted).toBe(false);
      });
    } finally {
      cleanup();
    }
  });

  it("recovers when the Next button is absent", async () => {
    handleStatSelectionMock.mockImplementation(() => {
      throw new Error("stat selection failed");
    });

    document.body.innerHTML = `<div id="stat-buttons"></div>`;

    const store = {};
    renderStatButtons(store);

    const statButton = document.querySelector("[data-stat]");
    await withListenerSpy(statButton, "click", async (calls) => {
      statButton.click();

      expect(calls).toHaveLength(1);
      expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
      expect(startCooldownMock).toHaveBeenCalledTimes(1);
      expect(store.__uiCooldownStarted).toBe(false);
      expect(enableNextRoundButtonMock).toHaveBeenCalled();
      expect(document.getElementById("next-button")).toBeNull();
    });
  });

  it("logs cooldown failure and still re-enables Next when startCooldown throws", async () => {
    startCooldownMock.mockImplementation(() => {
      throw new Error("cooldown failure");
    });
    handleStatSelectionMock.mockImplementation(() => {
      throw new Error("stat selection failed");
    });

    document.body.innerHTML = `<div id="stat-buttons"></div>`;

    const store = {};
    renderStatButtons(store);

    const statButton = document.querySelector("[data-stat]");
    await withListenerSpy(statButton, "click", async (calls) => {
      statButton.click();

      expect(calls).toHaveLength(1);
      expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
      expect(startCooldownMock).toHaveBeenCalledTimes(1);
      expect(store.__uiCooldownStarted).toBe(false);
      expect(enableNextRoundButtonMock).toHaveBeenCalled();
    });
  });

  it("keeps opponent choosing message visible before countdown when opponent delay is zero", async () => {
    const { cleanup } = useCanonicalTimers();
    const eventLog = [];
    const eventHandlers = [
      [
        "opponentPromptReady",
        (event) => {
          eventLog.push({ type: "opponentPromptReady", detail: event.detail });
        }
      ],
      [
        "battleStateChange",
        (event) => {
          eventLog.push({ type: "battleStateChange", detail: event.detail });
        }
      ]
    ];

    for (const [type, handler] of eventHandlers) {
      onBattleEvent(type, handler);
    }

    try {
      handleStatSelectionMock.mockImplementation(() => ({ matchEnded: false }));

      document.body.innerHTML = `
        <div id="score-display"></div>
        <div id="round-counter"></div>
        <div id="snackbar-container"></div>
        <div id="stat-buttons"></div>
        <div id="next-round-timer"></div>
      `;

      const store = {};
      renderStatButtons(store);

      const { setOpponentDelay } = await import("../../../src/helpers/classicBattle/snackbar.js");
      setOpponentDelay(0);

      const minDisplay = 200;
      const win = globalThis.window || (globalThis.window = {});
      const previousMin = win.__MIN_OPPONENT_MESSAGE_DURATION_MS;
      win.__MIN_OPPONENT_MESSAGE_DURATION_MS = minDisplay;

      const statButton = document.querySelector("[data-stat]");
      await withListenerSpy(statButton, "click", async (calls) => {
        statButton.click();

        expect(calls).toHaveLength(1);

        await flushMicrotasks();

        expect(showSnackbarMock).toHaveBeenCalledWith("Opponent is choosing…");
        expect(startCooldownMock).not.toHaveBeenCalled();

        const promptIndex = eventLog.findIndex((entry) => entry.type === "opponentPromptReady");
        expect(promptIndex).toBeGreaterThanOrEqual(0);
        const promptEvent = eventLog[promptIndex];
        expect(promptEvent.detail).toBeDefined();
        expect(promptEvent.detail).toEqual(expect.any(Object));
        const initialCooldownIndex = eventLog.findIndex(
          (entry) => entry.type === "battleStateChange" && entry.detail?.to === "cooldown"
        );
        expect(initialCooldownIndex).toBe(-1);

        const getTimerCount =
          typeof vi.getTimerCount === "function" ? () => vi.getTimerCount() : null;
        if (getTimerCount) {
          // Verify timers are scheduled before advancing them (opponent delay timer should be active)
          expect(getTimerCount()).toBeGreaterThan(0);
        }

        await vi.runAllTimersAsync();
        await flushMicrotasks();

        expect(startCooldownMock).toHaveBeenCalledTimes(1);
        const cooldownEvents = eventLog.filter(
          (entry) => entry.type === "battleStateChange" && entry.detail?.to === "cooldown"
        );
        expect(cooldownEvents).toHaveLength(1);
        const cooldownIndex = eventLog.findIndex(
          (entry) => entry.type === "battleStateChange" && entry.detail?.to === "cooldown"
        );
        expect(cooldownIndex).toBeGreaterThanOrEqual(0);
        expect(cooldownIndex).toBeGreaterThan(promptIndex);

        const lastMessage = showSnackbarMock.mock.calls.at(-1)?.[0];
        expect(lastMessage).toBe("Opponent is choosing…");
        const snackOrder = showSnackbarMock.mock.invocationCallOrder?.[0] ?? 0;
        const cooldownOrder = startCooldownMock.mock.invocationCallOrder?.[0] ?? Infinity;
        expect(snackOrder).toBeLessThan(cooldownOrder);

        if (typeof previousMin === "undefined") {
          delete win.__MIN_OPPONENT_MESSAGE_DURATION_MS;
        } else {
          win.__MIN_OPPONENT_MESSAGE_DURATION_MS = previousMin;
        }
      });
    } finally {
      const cleanupErrors = [];
      for (const [type, handler] of eventHandlers) {
        try {
          offBattleEvent(type, handler);
        } catch (error) {
          cleanupErrors.push({ type, error });
        }
      }
      if (cleanupErrors.length > 0) {
        const details = cleanupErrors
          .map(({ type, error }) => `${type}: ${error?.message ?? error}`)
          .join(", ");
        throw new AggregateError(
          cleanupErrors.map(({ error }) => error),
          `Failed to remove battle event handlers (${details})`
        );
      }
      cleanup();
    }
  });
});
