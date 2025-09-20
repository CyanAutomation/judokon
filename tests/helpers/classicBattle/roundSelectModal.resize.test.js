import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import installRAFMock from "../rafMock.js";

let modalInstance;
let modalCloseSpy;

function mockModalReturning(backdrop) {
  modalCloseSpy = vi.fn();
  modalInstance = {
    element: backdrop,
    open: vi.fn(),
    close: modalCloseSpy,
    destroy: vi.fn()
  };
  vi.doMock("../../../src/components/Modal.js", () => ({
    createModal: vi.fn(() => modalInstance)
  }));
}

describe("roundSelectModal responsive inset and cleanup", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  // Install queued RAF mock for deterministic control
  const raf = installRAFMock();
  global.__roundSelectRafRestore = raf.restore;
    modalInstance = null;
    modalCloseSpy = null;
  });

  afterEach(() => {
    try {
      global.__roundSelectRafRestore?.();
    } catch {}
    vi.restoreAllMocks();
  });

  it("activates positioning once per lifecycle and cleans up via modal.close", async () => {
    const header = document.createElement("header");
    header.setAttribute("role", "banner");
    Object.defineProperty(header, "offsetHeight", { value: 40, configurable: true });
    document.body.appendChild(header);

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    mockModalReturning(backdrop);

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    vi.doMock("../../../src/helpers/tooltip.js", () => ({
      initTooltips: () => Promise.resolve(() => {})
    }));

    const { initRoundSelectModal } = await import(
      "../../../src/helpers/classicBattle/roundSelectModal.js"
    );

    await initRoundSelectModal(() => {});

    expect(modalInstance).toBeTruthy();
    expect(backdrop.dataset.roundSelectModalActive).toBe("true");

    const resizeCall = addSpy.mock.calls.find(([event]) => event === "resize");
    const orientationCall = addSpy.mock.calls.find(([event]) => event === "orientationchange");
    expect(resizeCall?.[1]).toBeTypeOf("function");
    expect(orientationCall?.[1]).toBeTypeOf("function");

    const enhancedClose = modalInstance.close;
    enhancedClose();

    expect(modalCloseSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith("resize", resizeCall?.[1]);
    expect(removeSpy).toHaveBeenCalledWith("orientationchange", orientationCall?.[1]);
    expect(backdrop.dataset.roundSelectModalActive).toBe("false");

    // Subsequent close calls should not re-register listeners or flip the marker back on
    enhancedClose();
    expect(modalCloseSpy).toHaveBeenCalledTimes(2);
    expect(backdrop.dataset.roundSelectModalActive).toBe("false");
    expect(addSpy.mock.calls.filter(([event]) => event === "resize")).toHaveLength(1);
    expect(addSpy.mock.calls.filter(([event]) => event === "orientationchange")).toHaveLength(1);
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
    vi.doMock("../../../src/helpers/tooltip.js", () => ({
      initTooltips: () => Promise.resolve(() => {})
    }));

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
