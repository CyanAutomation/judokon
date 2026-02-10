import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  let renderStatList;
  let selectStat;
  let battleCliDebug;

  beforeEach(async () => {
    vi.resetModules();
    mockDispatchBattleEvent.mockReset();

    if (!globalThis.window) {
      globalThis.window = globalThis;
    }

    if (!window.localStorage) {
      const backing = new Map();
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key) => (backing.has(key) ? backing.get(key) : null),
          setItem: (key, value) => backing.set(String(key), String(value)),
          removeItem: (key) => backing.delete(key),
          clear: () => backing.clear()
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
    renderStatList = module.renderStatList;
    selectStat = module.selectStat;

    ensureCliDomForTest({ reset: true });
    await renderStatList({
      stats: {
        power: 10,
        speed: 9,
        technique: 8,
        kumikata: 7,
        neWaza: 6
      }
    });

    battleCliDebug = window.__battleCLIinit;
    battleCliDebug?.__setStoreForTest?.({
      selectionMade: false,
      playerChoice: null
    });
  });

  afterEach(() => {
    battleCliDebug?.__setStoreForTest?.(null);
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

  it("ignores additional selections after store marks selectionMade", async () => {
    battleCliDebug?.__setStoreForTest?.({
      selectionMade: true,
      playerChoice: "power"
    });

    await selectStat("speed");

    expect(mockDispatchBattleEvent).not.toHaveBeenCalled();
  });
});
