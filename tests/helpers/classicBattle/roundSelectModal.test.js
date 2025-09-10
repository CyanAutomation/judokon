import { describe, it, expect, vi, beforeEach } from "vitest";
import { CLASSIC_BATTLE_POINTS_TO_WIN } from "../../../src/helpers/constants.js";
import { wrap } from "../../../src/helpers/storage.js";
import { BATTLE_POINTS_TO_WIN } from "../../../src/config/storageKeys.js";
import rounds from "../../../src/data/battleRounds.js";

const mocks = vi.hoisted(() => {
  const modal = { open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
  const defaultCreateModal = (content) => {
    const element = document.createElement("div");
    element.appendChild(content);
    return {
      element,
      open: modal.open,
      close: modal.close,
      destroy: modal.destroy
    };
  };
  return {
    setPointsToWin: vi.fn(),
    initTooltips: vi.fn(),
    modal,
    emit: vi.fn(),
    logEvent: vi.fn(),
    createModal: vi.fn(defaultCreateModal),
    defaultCreateModal
  };
});
vi.mock("../../../src/components/Button.js", () => ({
  createButton: (label, { id } = {}) => {
    const btn = document.createElement("button");
    if (id) btn.id = id;
    btn.textContent = label;
    return btn;
  }
}));
vi.mock("../../../src/components/Modal.js", () => ({
  createModal: (...args) => mocks.createModal(...args)
}));
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  setPointsToWin: mocks.setPointsToWin
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({ initTooltips: mocks.initTooltips }));
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: mocks.emit
}));
vi.mock("../../../src/helpers/telemetry.js", () => ({ logEvent: mocks.logEvent }));

import { initRoundSelectModal } from "../../../src/helpers/classicBattle/roundSelectModal.js";

describe("initRoundSelectModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    wrap(BATTLE_POINTS_TO_WIN).remove();
    vi.clearAllMocks();
    mocks.cleanup = vi.fn();
    mocks.initTooltips.mockResolvedValue(mocks.cleanup);
    mocks.createModal.mockImplementation(mocks.defaultCreateModal);
    window.history.replaceState({}, "", "/");
  });

  it("renders three options from battleRounds.js", async () => {
    await initRoundSelectModal(vi.fn());
    const buttons = document.querySelectorAll(".round-select-buttons button");
    expect(buttons).toHaveLength(3);
    expect([...buttons].map((b) => b.textContent)).toEqual(rounds.map((r) => r.label));
    expect(mocks.emit).toHaveBeenCalledWith("roundOptionsReady");
  });

  it("selecting an option persists, cleans up, and starts the match", async () => {
    const onStart = vi.fn();
    await initRoundSelectModal(onStart);
    const first = document.querySelector(".round-select-buttons button");
    first.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(rounds[0].value);
    expect(wrap(BATTLE_POINTS_TO_WIN).get()).toBe(rounds[0].value);
    expect(onStart).toHaveBeenCalled();
    expect(mocks.cleanup).toHaveBeenCalled();
    expect(mocks.logEvent).toHaveBeenCalledWith("battle.start", {
      pointsToWin: rounds[0].value,
      source: "modal"
    });
    expect(mocks.emit).toHaveBeenNthCalledWith(1, "roundOptionsReady");
    expect(mocks.emit).toHaveBeenNthCalledWith(2, "startClicked");
    const startOrder = onStart.mock.invocationCallOrder[0];
    const emitOrder = mocks.emit.mock.invocationCallOrder[1];
    expect(startOrder).toBeLessThan(emitOrder);
  });

  it("opens modal and starts match even if tooltip init fails", async () => {
    const onStart = vi.fn();
    const error = new Error("tooltip fail");
    mocks.initTooltips.mockRejectedValue(error);
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    await initRoundSelectModal(onStart);
    expect(mocks.modal.open).toHaveBeenCalled();
    expect(consoleErr).toHaveBeenCalledWith("Failed to initialize tooltips:", error);
    const first = document.querySelector(".round-select-buttons button");
    first.click();
    expect(onStart).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("auto-starts a default match when ?autostart=1 is present", async () => {
    const onStart = vi.fn();
    window.history.replaceState({}, "", "?autostart=1");
    await initRoundSelectModal(onStart);
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(CLASSIC_BATTLE_POINTS_TO_WIN);
    expect(onStart).toHaveBeenCalled();
    expect(document.querySelector(".round-select-buttons")).toBeNull();
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.initTooltips).not.toHaveBeenCalled();
    expect(mocks.cleanup).not.toHaveBeenCalled();
    expect(mocks.logEvent).not.toHaveBeenCalled();
    expect(wrap(BATTLE_POINTS_TO_WIN).get()).toBeNull();
  });

  it("uses persisted selection when available and skips modal", async () => {
    // Explicitly mock telemetry.js within the test block
    vi.doMock("../../../src/helpers/telemetry.js", () => ({ logEvent: vi.fn() }));

    // Import logEvent and initRoundSelectModal after the mock is set up
    const { logEvent } = await import("../../../src/helpers/telemetry.js");
    const { initRoundSelectModal } = await import("../../../src/helpers/classicBattle/roundSelectModal.js");
    const onStart = vi.fn();
    wrap(BATTLE_POINTS_TO_WIN).set(rounds[1].value);
    await initRoundSelectModal(onStart);
        expect(logEvent).toHaveBeenCalledWith("battle.start", {
      pointsToWin: rounds[1].value,
      source: "storage"
    });
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(rounds[1].value);
    expect(onStart).toHaveBeenCalled();
    expect(document.querySelector(".round-select-buttons")).toBeNull();
    expect(mocks.initTooltips).not.toHaveBeenCalled();
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });

  it("propagates errors when modal creation fails", async () => {
    const onStart = vi.fn();
    const error = new Error("modal fail");
    mocks.createModal.mockImplementation(() => {
      throw error;
    });
    await expect(initRoundSelectModal(onStart)).rejects.toThrow(error);
    expect(onStart).not.toHaveBeenCalled();
  });
});
