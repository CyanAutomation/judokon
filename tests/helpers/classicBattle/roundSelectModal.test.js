import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { CLASSIC_BATTLE_POINTS_TO_WIN } from "../../../src/helpers/constants.js";
import { wrap } from "../../../src/helpers/storage.js";
import { BATTLE_POINTS_TO_WIN } from "../../../src/config/storageKeys.js";

const rounds = JSON.parse(readFileSync(resolve("src/data/battleRounds.json"), "utf8"));

const mocks = vi.hoisted(() => ({
  fetchJson: vi.fn(),
  setPointsToWin: vi.fn(),
  initTooltips: vi.fn(),
  modal: { open: vi.fn(), close: vi.fn() },
  emit: vi.fn()
}));

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: mocks.fetchJson,
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../../../src/components/Button.js", () => ({
  createButton: (label, { id } = {}) => {
    const btn = document.createElement("button");
    if (id) btn.id = id;
    btn.textContent = label;
    return btn;
  }
}));
vi.mock("../../../src/components/Modal.js", () => ({
  createModal: (content) => {
    const element = document.createElement("div");
    element.appendChild(content);
    return { element, open: mocks.modal.open, close: mocks.modal.close, destroy: vi.fn() };
  }
}));
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  setPointsToWin: mocks.setPointsToWin
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({ initTooltips: mocks.initTooltips }));
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: mocks.emit
}));

import { initRoundSelectModal } from "../../../src/helpers/classicBattle/roundSelectModal.js";

describe("initRoundSelectModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    wrap(BATTLE_POINTS_TO_WIN).remove();
    vi.clearAllMocks();
    mocks.fetchJson.mockResolvedValue(rounds);
    mocks.cleanup = vi.fn();
    mocks.initTooltips.mockResolvedValue(mocks.cleanup);
    window.history.replaceState({}, "", "/");
  });

  it("renders three options from battleRounds.json", async () => {
    await initRoundSelectModal(vi.fn());
    const buttons = document.querySelectorAll(".round-select-buttons button");
    expect(buttons).toHaveLength(3);
    expect([...buttons].map((b) => b.textContent)).toEqual(rounds.map((r) => r.label));
    expect(mocks.emit).toHaveBeenCalledWith("roundOptionsReady");
  });

  it("selecting an option sets points and starts the match", async () => {
    const onStart = vi.fn();
    await initRoundSelectModal(onStart);
    const first = document.querySelector(".round-select-buttons button");
    first.click();
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(rounds[0].value);
    expect(onStart).toHaveBeenCalled();
    expect(mocks.cleanup).toHaveBeenCalled();
    expect(mocks.emit).toHaveBeenNthCalledWith(1, "roundOptionsReady");
    expect(mocks.emit).toHaveBeenNthCalledWith(2, "startClicked");
    const emitOrder = mocks.emit.mock.invocationCallOrder[1];
    const startOrder = onStart.mock.invocationCallOrder[0];
    expect(emitOrder).toBeLessThan(startOrder);
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

  it("falls back to defaults when rounds fail to load", async () => {
    const onStart = vi.fn();
    const error = new Error("load fail");
    mocks.fetchJson.mockRejectedValue(error);
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    await initRoundSelectModal(onStart);
    expect(consoleErr).toHaveBeenCalledWith("Failed to load battle rounds:", error);
    const note = document.getElementById("round-select-error");
    expect(note).not.toBeNull();
    expect(note.textContent).toContain("Failed to load match options");
    const buttons = document.querySelectorAll(".round-select-buttons button");
    expect([...buttons].map((b) => b.textContent)).toEqual(["Quick", "Medium", "Long"]);
    buttons[0].click();
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(5);
    expect(onStart).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("auto-starts a default match when ?autostart=1 is present", async () => {
    const onStart = vi.fn();
    window.history.replaceState({}, "", "?autostart=1");
    await initRoundSelectModal(onStart);
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(CLASSIC_BATTLE_POINTS_TO_WIN);
    expect(onStart).toHaveBeenCalled();
    expect(mocks.fetchJson).not.toHaveBeenCalled();
    expect(document.querySelector(".round-select-buttons")).toBeNull();
    expect(mocks.emit).not.toHaveBeenCalled();
  });
});
