import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockModalReturning(backdrop) {
  vi.doMock("../../../src/components/Modal.js", () => ({
    createModal: vi.fn(() => ({
      element: backdrop,
      open: vi.fn(),
      close: vi.fn(),
      destroy: vi.fn()
    }))
  }));
}

describe("roundSelectModal responsive inset and cleanup", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    // Ensure RAF exists for debounced resize path
    global.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates inset on resize and stops after close", async () => {
    const header = document.createElement("header");
    header.setAttribute("role", "banner");
    Object.defineProperty(header, "offsetHeight", { value: 64, configurable: true });
    document.body.appendChild(header);

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    mockModalReturning(backdrop);

    // Mock tooltips to resolve quickly
    vi.doMock("../../../src/helpers/tooltip.js", () => ({ initTooltips: () => Promise.resolve(() => {}) }));

    const { initRoundSelectModal } = await import(
      "../../../src/helpers/classicBattle/roundSelectModal.js"
    );

    await initRoundSelectModal(() => {});

    // initial
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("64px");

    // change header height and dispatch resize
    Object.defineProperty(header, "offsetHeight", { value: 80, configurable: true });
    window.dispatchEvent(new Event("resize"));

    // wait a tick for RAF
    await new Promise((r) => setTimeout(r, 0));
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("80px");

    // simulate close (cleanup listeners)
    backdrop.dispatchEvent(new Event("close"));

    // change again and resize; inset should remain at previous value
    Object.defineProperty(header, "offsetHeight", { value: 100, configurable: true });
    window.dispatchEvent(new Event("resize"));
    await new Promise((r) => setTimeout(r, 0));
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("80px");
  });
});

