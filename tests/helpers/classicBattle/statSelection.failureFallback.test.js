import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("classicBattle stat selection failure recovery", () => {
  const ROUND_MANAGER_PATH = "../../../src/helpers/classicBattle/roundManager.js";
  const SELECTION_HANDLER_PATH = "../../../src/helpers/classicBattle/selectionHandler.js";
  let renderStatButtons;
  let startCooldownMock;
  let handleStatSelectionMock;
  let originalRequestAnimationFrame;
  let originalLocalStorage;

  beforeEach(async () => {
    vi.resetModules();
    startCooldownMock = vi.fn();
    handleStatSelectionMock = vi.fn();

    vi.doMock(ROUND_MANAGER_PATH, () => ({
      startCooldown: startCooldownMock,
      createBattleStore: vi.fn(() => ({ __uiCooldownStarted: false }))
    }));

    vi.doMock(SELECTION_HANDLER_PATH, () => ({
      handleStatSelection: handleStatSelectionMock
    }));

    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => {
      if (typeof cb === "function") {
        cb();
      }
      return 1;
    };

    originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };

    ({ renderStatButtons } = await import("../../../src/pages/battleClassic.init.js"));
  });

  afterEach(() => {
    document.body.innerHTML = "";
    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete globalThis.requestAnimationFrame;
    }
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("starts cooldown and marks Next ready when selection handler rejects", async () => {
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

    expect(startCooldownMock).toHaveBeenCalledTimes(1);
    expect(startCooldownMock).toHaveBeenCalledWith(store);
    expect(store.__uiCooldownStarted).toBe(false);

    const nextBtn = document.getElementById("next-button");
    expect(nextBtn.disabled).toBe(false);
    expect(nextBtn.getAttribute("data-next-ready")).toBe("true");
    expect(nextBtn.dataset.nextReady).toBe("true");
  });
});
