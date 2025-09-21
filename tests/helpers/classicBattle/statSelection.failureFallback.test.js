import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import installRAFMock from "../rafMock.js";

describe("classicBattle stat selection failure recovery", () => {
  const ROUND_MANAGER_PATH = "../../../src/helpers/classicBattle/roundManager.js";
  const SELECTION_HANDLER_PATH = "../../../src/helpers/classicBattle/selectionHandler.js";
  let renderStatButtons;
  let startCooldownMock;
  let handleStatSelectionMock;
  let showSnackbarMock;
  let previousMinDuration;
  let originalLocalStorage;

  beforeEach(async () => {
    vi.resetModules();
    startCooldownMock = vi.fn();
    handleStatSelectionMock = vi.fn();
    showSnackbarMock = vi.fn();

    vi.doMock(ROUND_MANAGER_PATH, () => ({
      startCooldown: startCooldownMock,
      createBattleStore: vi.fn(() => ({ __uiCooldownStarted: false }))
    }));

    vi.doMock(SELECTION_HANDLER_PATH, () => ({
      handleStatSelection: handleStatSelectionMock,
      getPlayerAndOpponentValues: vi.fn(() => ({ playerVal: 5, opponentVal: 3 }))
    }));

    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: (...args) => showSnackbarMock(...args),
      updateSnackbar: vi.fn()
    }));

    vi.doMock("../../../src/helpers/i18n.js", () => ({
      t: (key) => (key === "ui.opponentChoosing" ? "Opponent is choosing…" : key)
    }));

    // Install queued RAF mock and allow tests to flush synchronously when needed
    const raf = installRAFMock();
    global.__statSelectionRafRestore = raf.restore;

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
      global.__statSelectionRafRestore?.();
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
  });

  it("starts cooldown, resets cooldown flag, and marks Next ready when selection handler rejects", async () => {
    handleStatSelectionMock.mockRejectedValue(new Error("stat selection failed"));

    document.body.innerHTML = `
      <div id="stat-buttons"></div>
      <button id="next-button" data-role="next-round" disabled></button>
    `;

    const store = {};
    renderStatButtons(store);

    const btn = document.querySelector("[data-stat]");
    expect(btn).toBeTruthy();

    btn.click();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
    expect(handleStatSelectionMock).toHaveBeenCalledWith(
      store,
      expect.any(String),
      expect.objectContaining({ playerVal: 5, opponentVal: 3 })
    );
    expect(startCooldownMock).toHaveBeenCalledTimes(1);
    expect(startCooldownMock).toHaveBeenCalledWith(store);
    expect(store.__uiCooldownStarted).toBe(false);

    const nextBtn = document.getElementById("next-button");
    expect(nextBtn.disabled).toBe(false);
    expect(nextBtn.getAttribute("data-next-ready")).toBe("true");
    expect(nextBtn.dataset.nextReady).toBe("true");
  });

  it("immediately triggers cooldown on selection failure without advancing timers", async () => {
    vi.useFakeTimers();
    handleStatSelectionMock.mockRejectedValue(new Error("stat selection failed"));

    document.body.innerHTML = `
      <div id="stat-buttons"></div>
      <button id="next-button" data-role="next-round" disabled></button>
    `;

    const store = {};
    renderStatButtons(store);

    const btn = document.querySelector("[data-stat]");
    expect(btn).toBeTruthy();

    btn.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
    expect(startCooldownMock).toHaveBeenCalledTimes(1);
    expect(startCooldownMock).toHaveBeenCalledWith(store);
    expect(store.__uiCooldownStarted).toBe(false);
  });

  it("recovers when the Next button is absent", async () => {
    handleStatSelectionMock.mockRejectedValue(new Error("stat selection failed"));

    document.body.innerHTML = `
      <div id="stat-buttons"></div>
    `;

    const store = {};
    renderStatButtons(store);

    const btn = document.querySelector("[data-stat]");
    expect(btn).toBeTruthy();

    btn.click();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
    expect(startCooldownMock).toHaveBeenCalledTimes(1);
    expect(store.__uiCooldownStarted).toBe(false);
    expect(document.getElementById("next-button")).toBeNull();
  });

  it("logs cooldown failure and still re-enables Next when startCooldown throws", async () => {
    startCooldownMock.mockImplementation(() => {
      throw new Error("cooldown failure");
    });
    handleStatSelectionMock.mockRejectedValue(new Error("stat selection failed"));

    document.body.innerHTML = `
      <div id="stat-buttons"></div>
      <button id="next-button" data-role="next-round" disabled></button>
    `;

    const store = {};
    renderStatButtons(store);

    const btn = document.querySelector("[data-stat]");
    expect(btn).toBeTruthy();

    btn.click();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handleStatSelectionMock).toHaveBeenCalledTimes(1);
    expect(startCooldownMock).toHaveBeenCalledTimes(1);
    expect(store.__uiCooldownStarted).toBe(false);

    const nextBtn = document.getElementById("next-button");
    expect(nextBtn.disabled).toBe(false);
    expect(nextBtn.getAttribute("data-next-ready")).toBe("true");
  });

  it("keeps opponent choosing message visible before countdown when opponent delay is zero", async () => {
    vi.useFakeTimers();
    handleStatSelectionMock.mockResolvedValue({ matchEnded: false });

    document.body.innerHTML = `
      <div id="score-display"></div>
      <div id="round-counter"></div>
      <div id="snackbar-container"></div>
      <div id="stat-buttons"></div>
      <div id="next-round-timer"></div>
      <button id="next-button" data-role="next-round" disabled></button>
    `;

    const store = {};
    renderStatButtons(store);

    const btn = document.querySelector("[data-stat]");
    expect(btn).toBeTruthy();

    const { setOpponentDelay } = await import("../../../src/helpers/classicBattle/snackbar.js");
    setOpponentDelay(0);

    const minDisplay = 200;
    const win = globalThis.window || (globalThis.window = {});
    const previousMin = win.__MIN_OPPONENT_MESSAGE_DURATION_MS;
    win.__MIN_OPPONENT_MESSAGE_DURATION_MS = minDisplay;

    btn.click();

    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(showSnackbarMock).toHaveBeenCalledWith("Opponent is choosing…");
    expect(startCooldownMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(minDisplay - 1);
    expect(startCooldownMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();

    expect(startCooldownMock).toHaveBeenCalledTimes(1);
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
});
