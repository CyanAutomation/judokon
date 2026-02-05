import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestController } from "../../../src/utils/scheduler.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockCreateModal, mockInitTooltips } = vi.hoisted(() => ({
  mockCreateModal: vi.fn(),
  mockInitTooltips: vi.fn(() => Promise.resolve(() => {}))
}));

// ===== Top-level vi.mock() calls =====
vi.mock("../../../src/components/Modal.js", () => ({
  createModal: mockCreateModal
}));

vi.mock("../../../src/helpers/tooltip.js", () => ({
  initTooltips: mockInitTooltips
}));

let modalInstance;
let modalCloseSpy;
let testController;

// Enable test controller access
globalThis.__TEST__ = true;

function configureModalMock(backdrop) {
  modalCloseSpy = vi.fn();
  modalInstance = {
    element: backdrop,
    open: vi.fn(),
    close: modalCloseSpy,
    destroy: vi.fn()
  };
  mockCreateModal.mockReturnValue(modalInstance);
}

describe("roundSelectModal responsive inset and cleanup", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    // Create test controller for deterministic RAF control
    testController = createTestController();
    modalInstance = null;
    modalCloseSpy = null;
    // Reset mocks for this test
    mockCreateModal.mockClear().mockReturnValue(null);
    mockInitTooltips.mockClear().mockResolvedValue(() => {});
  });

  afterEach(() => {
    try {
      testController?.dispose();
    } catch {}
    testController = null;
    vi.restoreAllMocks();
  });

  it("activates positioning once per lifecycle and cleans up via modal.close", async () => {
    const header = document.createElement("header");
    header.setAttribute("role", "banner");
    Object.defineProperty(header, "offsetHeight", { value: 40, configurable: true });
    document.body.appendChild(header);

    const backdrop = document.createElement("dialog");
    backdrop.className = "modal";
    configureModalMock(backdrop);

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { resolveRoundStartPolicy } = await import(
      "../../../src/helpers/classicBattle/roundSelectModal.js"
    );

    await resolveRoundStartPolicy(() => {});

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

    const backdrop = document.createElement("dialog");
    backdrop.className = "modal";
    configureModalMock(backdrop);

    const { resolveRoundStartPolicy } = await import(
      "../../../src/helpers/classicBattle/roundSelectModal.js"
    );

    await resolveRoundStartPolicy(() => {});

    // initial
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("64px");

    // change header height and dispatch resize
    Object.defineProperty(header, "offsetHeight", { value: 80, configurable: true });
    window.dispatchEvent(new Event("resize"));

    // wait a tick for RAF
    testController.advanceFrame();
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("80px");

    // simulate close (cleanup listeners)
    backdrop.dispatchEvent(new Event("close"));

    // change again and resize; inset should remain at previous value
    Object.defineProperty(header, "offsetHeight", { value: 100, configurable: true });
    window.dispatchEvent(new Event("resize"));
    testController.advanceFrame();
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("80px");
  });
});
