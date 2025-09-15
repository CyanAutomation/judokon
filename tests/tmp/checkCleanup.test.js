import { describe, it, vi, beforeEach } from "vitest";

function mockModalReturning(backdrop) {
  vi.doMock("../../src/components/Modal.js", () => ({
    createModal: vi.fn(() => ({
      element: backdrop,
      open: vi.fn(),
      close: vi.fn(),
      destroy: vi.fn()
    }))
  }));
}

describe("cleanup counter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    window.__cleanupCallCount = 0;
    global.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  });

  it("matches resize cleanup scenario", async () => {
    const header = document.createElement("header");
    header.setAttribute("role", "banner");
    Object.defineProperty(header, "offsetHeight", { value: 64, configurable: true });
    document.body.appendChild(header);

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    mockModalReturning(backdrop);

    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: () => Promise.resolve(() => {})
    }));

    const { initRoundSelectModal } = await import("../../src/helpers/classicBattle/roundSelectModal.js");
    await initRoundSelectModal(() => {});

    Object.defineProperty(header, "offsetHeight", { value: 80, configurable: true });
    window.dispatchEvent(new Event("resize"));
    await new Promise((r) => setTimeout(r, 0));

    backdrop.dispatchEvent(new Event("close"));

    Object.defineProperty(header, "offsetHeight", { value: 100, configurable: true });
    window.dispatchEvent(new Event("resize"));
    await new Promise((r) => setTimeout(r, 0));

    const finalInset = backdrop.style.getPropertyValue("--modal-inset-top");
    if (finalInset !== "80px") {
      throw new Error(
        `expected 80px but got ${finalInset}; cleanup=${window.__cleanupCallCount}`
      );
    }
  });
});
