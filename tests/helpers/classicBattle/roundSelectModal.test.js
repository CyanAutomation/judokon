import { describe, it, expect, vi, beforeEach } from "vitest";
import { CLASSIC_BATTLE_POINTS_TO_WIN } from "../../../src/helpers/constants.js";
import { wrap } from "../../../src/helpers/storage.js";
import { BATTLE_POINTS_TO_WIN } from "../../../src/config/storageKeys.js";
import rounds from "../../../src/data/battleRounds.js";

const observeMockCall = (mockFn, projector = (...args) => args) => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  mockFn.mockImplementation((...args) => {
    resolve(projector(...args));
  });
  return promise;
};

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
    dispatchBattleEvent: vi.fn(() => Promise.resolve(true)),
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
vi.mock("../../../src/helpers/BattleEngine.js", () => ({
  createBattleEngine: vi.fn(),
  getPointsToWin: vi.fn(),
  getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 })),
  setPointsToWin: mocks.setPointsToWin
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({ initTooltips: mocks.initTooltips }));
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: mocks.emit,
  onBattleEvent: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: (...args) => mocks.dispatchBattleEvent(...args)
}));
vi.mock("../../../src/helpers/telemetry.js", () => ({ logEvent: mocks.logEvent }));

import { resolveRoundStartPolicy } from "../../../src/helpers/classicBattle/roundSelectModal.js";

describe("resolveRoundStartPolicy", () => {
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
    await resolveRoundStartPolicy(vi.fn());
    const buttons = document.querySelectorAll(".round-select-buttons button");
    expect(buttons).toHaveLength(3);
    expect([...buttons].map((b) => b.textContent)).toEqual(rounds.map((r) => r.label));
    expect(mocks.emit).toHaveBeenCalledWith("roundOptionsReady");
  });

  it("selecting an option persists, cleans up, and starts the match", async () => {
    const onStart = vi.fn(() => Promise.resolve());
    const setPointsCalled = observeMockCall(mocks.setPointsToWin, (value) => value);
    const loggedStart = observeMockCall(mocks.logEvent);

    await resolveRoundStartPolicy(onStart);
    const first = document.querySelector(".round-select-buttons button");
    first.click();
    const startComplete = onStart.mock.results[0]?.value ?? Promise.resolve();
    await Promise.all([setPointsCalled, loggedStart, startComplete]);
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
    expect(first.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens modal and starts match even if tooltip init fails", async () => {
    const onStart = vi.fn();
    const error = new Error("tooltip fail");
    mocks.initTooltips.mockRejectedValue(error);
    await resolveRoundStartPolicy(onStart);
    expect(mocks.modal.open).toHaveBeenCalled();
    expect(mocks.logEvent).toHaveBeenCalledWith("tooltip.error", {
      type: "initializationFailed",
      error: error.message,
      context: "roundSelectModal"
    });
    const first = document.querySelector(".round-select-buttons button");
    first.click();
    expect(onStart).toHaveBeenCalled();
  });

  it("auto-starts a default match when ?autostart=1 is present", async () => {
    const onStart = vi.fn();
    window.history.replaceState({}, "", "?autostart=1");
    await resolveRoundStartPolicy(onStart);
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(CLASSIC_BATTLE_POINTS_TO_WIN);
    expect(onStart).toHaveBeenCalled();
    expect(document.querySelector(".round-select-buttons")).toBeNull();
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.initTooltips).not.toHaveBeenCalled();
    expect(mocks.cleanup).not.toHaveBeenCalled();
    // logEvent may be called for dispatchBattleEvent failures (expected behavior)
    expect(wrap(BATTLE_POINTS_TO_WIN).get()).toBeNull();
  });

  it("preselects persisted selection but still requires confirmation", async () => {
    const onStart = vi.fn();
    wrap(BATTLE_POINTS_TO_WIN).set(rounds[1].value);
    await resolveRoundStartPolicy(onStart);
    const buttons = document.querySelectorAll(".round-select-buttons button");
    expect(buttons).toHaveLength(3);
    expect(onStart).not.toHaveBeenCalled();
    expect(mocks.setPointsToWin).not.toHaveBeenCalledWith(rounds[1].value);

    const preselected = document.querySelector('[data-default-selection="true"]');
    expect(preselected).toBe(buttons[1]);
    expect(preselected?.getAttribute("aria-pressed")).toBe("true");

    const nextSelection = observeMockCall(mocks.setPointsToWin, (value) => value);

    preselected?.click();

    await nextSelection;

    expect(mocks.setPointsToWin).toHaveBeenCalledWith(rounds[1].value);
    expect(onStart).toHaveBeenCalled();
  });

  it("propagates errors when modal creation fails", async () => {
    const onStart = vi.fn();
    const error = new Error("modal fail");
    mocks.createModal.mockImplementation(() => {
      throw error;
    });
    await expect(resolveRoundStartPolicy(onStart)).rejects.toThrow(error);
    expect(onStart).not.toHaveBeenCalled();
  });
});
