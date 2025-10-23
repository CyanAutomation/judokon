import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";

let modalOpenMock;
let modalElement;
let clearTimeoutSpy;

const createFakeTimeoutHandle = () => {
  const handle = {
    cleared: false,
    clear: vi.fn(() => {
      handle.cleared = true;
    })
  };
  return handle;
};

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  interruptMatch: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  showMessage: vi.fn(),
  clearTimer: vi.fn(),
  updateTimer: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
  resetSkipState: vi.fn()
}));
vi.mock("../../../src/components/Modal.js", () => ({
  createModal: (content) => {
    modalOpenMock = vi.fn();
    modalElement = document.createElement("dialog");
    modalElement.className = "modal";
    modalElement.append(content);
    return { element: modalElement, open: modalOpenMock, close: vi.fn(), destroy: vi.fn() };
  },
  createButton: (label, { id } = {}) => {
    const btn = document.createElement("button");
    if (id) btn.id = id;
    btn.textContent = label;
    return btn;
  }
}));

const listeners = [];
const origAdd = window.addEventListener;
const origRemove = window.removeEventListener;

beforeEach(() => {
  listeners.length = 0;
  window.addEventListener = (type, listener, options) => {
    listeners.push({ type, listener, options });
    return origAdd.call(window, type, listener, options);
  };
  window.removeEventListener = (type, listener, options) => {
    const idx = listeners.findIndex((l) => l.type === type && l.listener === listener);
    if (idx !== -1) listeners.splice(idx, 1);
    return origRemove.call(window, type, listener, options);
  };
  vi.clearAllMocks();
  vi.resetModules();
  clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout").mockImplementation((handle) => {
    if (handle && typeof handle === "object" && typeof handle.clear === "function") {
      handle.clear();
    }
  });
  modalOpenMock = null;
  modalElement = null;
  document.body.innerHTML = "";
});

afterEach(() => {
  for (const { type, listener, options } of listeners) {
    origRemove.call(window, type, listener, options);
  }
  window.addEventListener = origAdd;
  window.removeEventListener = origRemove;
  if (clearTimeoutSpy) {
    clearTimeoutSpy.mockRestore();
    clearTimeoutSpy = undefined;
  }
});

function createStore() {
  return {
    statTimeoutId: createFakeTimeoutHandle(),
    autoSelectId: createFakeTimeoutHandle(),
    compareRaf: 123
  };
}

describe("initInterruptHandlers", () => {
  it("cleans up and interrupts on pagehide", async () => {
    const { initInterruptHandlers } = await import(
      "../../../src/helpers/classicBattle/interruptHandlers.js"
    );
    const { interruptMatch } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage, clearTimer } = await import("../../../src/helpers/setupScoreboard.js");
    const { stop: stopScheduler, cancel } = await import("../../../src/utils/scheduler.js");
    const { resetSkipState } = await import("../../../src/helpers/classicBattle/skipHandler.js");

    const store = createStore();
    const { statTimeoutId, autoSelectId } = store;
    initInterruptHandlers(store);

    window.dispatchEvent(new Event("pagehide"));

    expect(store.statTimeoutId).toBeNull();
    expect(store.autoSelectId).toBeNull();
    expect(store.compareRaf).toBe(0);
    expect(statTimeoutId.clear).toHaveBeenCalledTimes(1);
    expect(autoSelectId.clear).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(123);
    expect(resetSkipState).toHaveBeenCalled();
    expect(clearTimer).toHaveBeenCalled();
    expect(stopScheduler).toHaveBeenCalled();
    expect(interruptMatch).toHaveBeenCalledWith("navigation");
    expect(showMessage).toHaveBeenCalledWith("Match interrupted: navigation");
    expect(dispatchBattleEvent).toHaveBeenCalledWith("interrupt", {
      reason: "navigation"
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });

  it("cleans up and interrupts on beforeunload", async () => {
    const { initInterruptHandlers } = await import(
      "../../../src/helpers/classicBattle/interruptHandlers.js"
    );
    const { interruptMatch } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage } = await import("../../../src/helpers/setupScoreboard.js");

    const store = createStore();
    initInterruptHandlers(store);

    window.dispatchEvent(new Event("beforeunload"));

    expect(interruptMatch).toHaveBeenCalledWith("navigation");
    expect(showMessage).toHaveBeenCalledWith("Match interrupted: navigation");
    expect(dispatchBattleEvent).toHaveBeenCalledWith("interrupt", {
      reason: "navigation"
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });

  it("opens error modal and interrupts on error event", async () => {
    const { initInterruptHandlers } = await import(
      "../../../src/helpers/classicBattle/interruptHandlers.js"
    );
    const { interruptMatch } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage } = await import("../../../src/helpers/setupScoreboard.js");

    const store = createStore();
    initInterruptHandlers(store);

    const errEv = new ErrorEvent("error", { message: "boom" });
    window.dispatchEvent(errEv);

    expect(interruptMatch).toHaveBeenCalledWith("error");
    expect(showMessage).toHaveBeenCalledWith("Match interrupted: boom");
    expect(dispatchBattleEvent).toHaveBeenCalledWith("interrupt", {
      reason: "boom"
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
    expect(modalOpenMock).toHaveBeenCalled();
    expect(modalElement.querySelector("p").textContent).toContain("boom");
  });

  it("opens error modal and interrupts on unhandledrejection", async () => {
    const { initInterruptHandlers } = await import(
      "../../../src/helpers/classicBattle/interruptHandlers.js"
    );
    const { interruptMatch } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage } = await import("../../../src/helpers/setupScoreboard.js");

    const store = createStore();
    initInterruptHandlers(store);

    const rejEv = new Event("unhandledrejection");
    rejEv.reason = new Error("nope");
    window.dispatchEvent(rejEv);

    expect(interruptMatch).toHaveBeenCalledWith("error");
    expect(showMessage).toHaveBeenCalledWith("Match interrupted: nope");
    expect(dispatchBattleEvent).toHaveBeenCalledWith("interrupt", {
      reason: "nope"
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
    expect(modalOpenMock).toHaveBeenCalled();
    expect(modalElement.querySelector("p").textContent).toContain("nope");
  });
});
