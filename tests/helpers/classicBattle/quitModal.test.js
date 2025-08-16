import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  quitMatch: vi.fn(() => ({ message: "Bye" }))
}));
vi.mock("../../../src/helpers/battle/index.js", () => ({
  showResult: vi.fn()
}));
vi.mock("../../../src/components/Modal.js", () => ({
  createModal: (content) => {
    const element = document.createElement("div");
    element.className = "modal-backdrop";
    element.appendChild(content);
    return { element, open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
  }
}));
vi.mock("../../../src/components/Button.js", () => ({
  createButton: (label, { id } = {}) => {
    const btn = document.createElement("button");
    if (id) btn.id = id;
    btn.textContent = label;
    return btn;
  }
}));

import { quitMatch } from "../../../src/helpers/classicBattle/quitModal.js";
import { createBattleStore } from "../../../src/helpers/classicBattle/roundManager.js";
import { quitMatch as engineQuit } from "../../../src/helpers/battleEngineFacade.js";
import { showResult } from "../../../src/helpers/battle/index.js";

describe("quitModal", () => {
  it("calls battleEngine.quitMatch when confirmed", () => {
    document.body.innerHTML = '<button id="quit-match-button"></button>';
    const store = createBattleStore();
    quitMatch(store);
    const confirm = document.getElementById("confirm-quit-button");
    confirm.click();
    expect(engineQuit).toHaveBeenCalled();
    expect(showResult).toHaveBeenCalledWith("Bye");
  });
});
