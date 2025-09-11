import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helper to mock Modal factory to return a predictable backdrop element
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

describe("roundSelectModal positioning and skinning", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies classic skin and header-aware inset under the classic header", async () => {
    const header = document.createElement("header");
    header.setAttribute("role", "banner");
    // Simulate a non-zero offsetHeight in JSDOM
    Object.defineProperty(header, "offsetHeight", { value: 64, configurable: true });
    document.body.appendChild(header);

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    mockModalReturning(backdrop);

    const { initRoundSelectModal } = await import(
      "../../../src/helpers/classicBattle/roundSelectModal.js"
    );

    // Mock tooltips to avoid async noise
    vi.doMock("../../../src/helpers/tooltip.js", () => ({
      initTooltips: () => Promise.resolve(() => {})
    }));

    await initRoundSelectModal(() => {});

    // The element is appended to the body by initRoundSelectModal
    expect(document.body.contains(backdrop)).toBe(true);
    expect(backdrop.classList.contains("classic-modal")).toBe(true);
    expect(backdrop.classList.contains("header-aware")).toBe(true);
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("64px");
  });

  it("applies CLI skin and header-aware inset under the CLI header", async () => {
    const header = document.createElement("header");
    header.id = "cli-header";
    // Simulate a non-zero offsetHeight in JSDOM
    Object.defineProperty(header, "offsetHeight", { value: 56, configurable: true });
    document.body.appendChild(header);

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    mockModalReturning(backdrop);

    const { initRoundSelectModal } = await import(
      "../../../src/helpers/classicBattle/roundSelectModal.js"
    );

    // Mock tooltips
    vi.doMock("../../../src/helpers/tooltip.js", () => ({
      initTooltips: () => Promise.resolve(() => {})
    }));

    await initRoundSelectModal(() => {});

    expect(document.body.contains(backdrop)).toBe(true);
    expect(backdrop.classList.contains("cli-modal")).toBe(true);
    expect(backdrop.classList.contains("header-aware")).toBe(true);
    expect(backdrop.style.getPropertyValue("--modal-inset-top")).toBe("56px");
  });
});
