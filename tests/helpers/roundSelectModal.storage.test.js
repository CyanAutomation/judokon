import { describe, it, expect, vi } from "vitest";

vi.doMock("../../src/helpers/storage.js", () => ({
  wrap: () => ({ get: () => 10, set: () => {}, remove: () => {} })
}));

vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
  setPointsToWin: vi.fn()
}));

vi.doMock("../../src/components/Modal.js", () => ({
  createModal: () => ({
    element: document.createElement("div"),
    open: () => {},
    close: () => {},
    destroy: () => {}
  })
}));

describe("roundSelectModal respects stored pointsToWin", () => {
  it("skips modal and applies stored value", async () => {
    const startSpy = vi.fn();
    const { initRoundSelectModal } = await import(
      "../../src/helpers/classicBattle/roundSelectModal.js"
    );
    const facade = await import("../../src/helpers/battleEngineFacade.js");
    document.body.innerHTML = '<div id="app"></div>';
    await initRoundSelectModal(startSpy);
    expect(facade.setPointsToWin).toHaveBeenCalledWith(10);
    expect(startSpy).toHaveBeenCalledOnce();
    // No modal should be present
    expect(document.querySelector(".modal-backdrop")).toBeNull();
  });
});
