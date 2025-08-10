import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const rounds = JSON.parse(readFileSync(resolve("src/data/battleRounds.json"), "utf8"));

const mocks = vi.hoisted(() => ({
  fetchJson: vi.fn(),
  setPointsToWin: vi.fn(),
  initTooltips: vi.fn()
}));

vi.mock("../../../src/helpers/dataUtils.js", () => ({ fetchJson: mocks.fetchJson }));
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
    return { element, open: vi.fn(), close: vi.fn() };
  }
}));
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  setPointsToWin: mocks.setPointsToWin
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({ initTooltips: mocks.initTooltips }));

import { initRoundSelectModal } from "../../../src/helpers/classicBattle/roundSelectModal.js";

describe("initRoundSelectModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.fetchJson.mockResolvedValue(rounds);
    mocks.initTooltips.mockResolvedValue();
  });

  it("renders three options from battleRounds.json", async () => {
    await initRoundSelectModal(vi.fn());
    const buttons = document.querySelectorAll(".round-select-buttons button");
    expect(buttons).toHaveLength(3);
    expect([...buttons].map((b) => b.textContent)).toEqual(rounds.map((r) => r.label));
  });

  it("selecting an option sets points and starts the match", async () => {
    const onStart = vi.fn();
    await initRoundSelectModal(onStart);
    const first = document.querySelector(".round-select-buttons button");
    first.click();
    expect(mocks.setPointsToWin).toHaveBeenCalledWith(rounds[0].value);
    expect(onStart).toHaveBeenCalled();
  });
});
