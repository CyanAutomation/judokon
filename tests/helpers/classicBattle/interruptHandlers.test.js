import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";

let modalOpenMock;
let modalElement;

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  battleEngine: { interruptMatch: vi.fn() }
}));
vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  showMessage: vi.fn(),
  clearTimer: vi.fn(),
  updateTimer: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
  resetSkipState: vi.fn()
}));
vi.mock("../../../src/components/Modal.js", () => ({
  createModal: (content) => {
    modalOpenMock = vi.fn();
    modalElement = document.createElement("div");
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
});

function createStore() {
  return {
    statTimeoutId: setTimeout(() => {}, 1000),
    autoSelectId: setTimeout(() => {}, 1000),
    compareRaf: 123
  };
}

describe("initInterruptHandlers", () => {
  it("cleans up and interrupts on pagehide", async () => {
    const { initInterruptHandlers } = await import(
      "../../../src/helpers/classicBattle/interruptHandlers.js"
    );
    const { battleEngine } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage, clearTimer } = await import("../../../src/helpers/setupScoreboard.js");
    const { stop: stopScheduler, cancel } = await import("../../../src/utils/scheduler.js");
    const { resetSkipState } = await import("../../../src/helpers/classicBattle/skipHandler.js");

    const store = createStore();
    initInterruptHandlers(store);

    window.dispatchEvent(new Event("pagehide"));

    expect(store.statTimeoutId).toBeNull();
    expect(store.autoSelectId).toBeNull();
    expect(store.compareRaf).toBe(0);
    expect(cancel).toHaveBeenCalledWith(123);
    expect(resetSkipState).toHaveBeenCalled();
    expect(clearTimer).toHaveBeenCalled();
    expect(stopScheduler).toHaveBeenCalled();
    expect(battleEngine.interruptMatch).toHaveBeenCalledWith("navigation");
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
    const { battleEngine } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage } = await import("../../../src/helpers/setupScoreboard.js");

    const store = createStore();
    initInterruptHandlers(store);

    window.dispatchEvent(new Event("beforeunload"));

    expect(battleEngine.interruptMatch).toHaveBeenCalledWith("navigation");
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
    const { battleEngine } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage } = await import("../../../src/helpers/setupScoreboard.js");

    const store = createStore();
    initInterruptHandlers(store);

    const errEv = new ErrorEvent("error", { message: "boom" });
    window.dispatchEvent(errEv);

    expect(battleEngine.interruptMatch).toHaveBeenCalledWith("error");
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
    const { battleEngine } = await import("../../../src/helpers/battleEngineFacade.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const { showMessage } = await import("../../../src/helpers/setupScoreboard.js");

    const store = createStore();
    initInterruptHandlers(store);

    const rejEv = new Event("unhandledrejection");
    rejEv.reason = new Error("nope");
    window.dispatchEvent(rejEv);

    expect(battleEngine.interruptMatch).toHaveBeenCalledWith("error");
    expect(showMessage).toHaveBeenCalledWith("Match interrupted: nope");
    expect(dispatchBattleEvent).toHaveBeenCalledWith("interrupt", {
      reason: "nope"
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
    expect(modalOpenMock).toHaveBeenCalled();
    expect(modalElement.querySelector("p").textContent).toContain("nope");
  });
});
