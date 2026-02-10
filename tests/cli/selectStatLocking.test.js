import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { mockDispatchBattleEvent } = vi.hoisted(() => ({
  mockDispatchBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/orchestrator.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    dispatchBattleEvent: mockDispatchBattleEvent
  };
});

describe("Battle CLI selectStat locking", () => {
  let ensureCliDomForTest;
  let selectStat;

  beforeEach(async () => {
    vi.resetModules();
    mockDispatchBattleEvent.mockReset();
    if (!globalThis.window) {
      globalThis.window = globalThis;
    }
    if (!window.localStorage) {
      const store = new Map();
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key) => (store.has(key) ? store.get(key) : null),
          setItem: (key, value) => store.set(String(key), String(value)),
          removeItem: (key) => store.delete(key),
          clear: () => store.clear()
        },
        configurable: true
      });
    }
    if (!globalThis.localStorage) {
      globalThis.localStorage = window.localStorage;
    }
    window.__TEST__ = true;

    const module = await import("../../src/pages/battleCLI/init.js");
    ensureCliDomForTest = module.ensureCliDomForTest;
    selectStat = module.selectStat;

    ensureCliDomForTest({ reset: true });
    
    // Initialize store with selectionMade flag to test the guard
    const module = await import("../../src/pages/battleCLI/init.js");
    if (typeof window !== "undefined") {
      window.battleStore = {
        selectionMade: false,
        playerChoice: null
      };
    }
    
    const list = document.getElementById("cli-stats");
    list.innerHTML = "";
    ["power", "speed"].forEach((stat, index) => {
      const row = document.createElement("div");
      row.className = "cli-stat";
      row.dataset.stat = stat;
      row.dataset.statIndex = String(index + 1);
      list.appendChild(row);
    });

  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    delete window.__TEST__;
  });

  it("dispatches statSelected once for rapid duplicate selectStat calls", async () => {
    let resolveDispatch;
    const pendingDispatch = new Promise((resolve) => {
      resolveDispatch = resolve;
    });
    mockDispatchBattleEvent.mockImplementationOnce(() => pendingDispatch);

    const firstSelection = selectStat("power");
    const secondSelection = selectStat("speed");

    await Promise.resolve();
    expect(mockDispatchBattleEvent).toHaveBeenCalledTimes(1);
    expect(mockDispatchBattleEvent).toHaveBeenCalledWith("statSelected");

    resolveDispatch();
    await firstSelection;
    await secondSelection;
  });
});
