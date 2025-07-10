import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(document, "readyState");

describe("setupBottomNavbar module", () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock fetch to prevent actual network calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: false,
      media: q,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    // Clear DOM
    document.body.innerHTML = "";

    // Add required DOM elements
    const navbar = document.createElement("nav");
    navbar.className = "bottom-navbar";
    document.body.appendChild(navbar);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";

    // Restore the original descriptor of document.readyState
    if (originalReadyStateDescriptor) {
      Object.defineProperty(document, "readyState", originalReadyStateDescriptor);
    }
  });

  it("sets up both navbar and button effects when DOM is loaded", async () => {
    // Create a button to test button effects
    const button = document.createElement("button");
    document.body.appendChild(button);

    // Setup fake timers for testing
    vi.useFakeTimers();

    // Import the module to trigger the DOMContentLoaded listener
    await import("../../src/helpers/setupBottomNavbar.js");

    // Simulate DOMContentLoaded event
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Wait for async operations to complete
    vi.advanceTimersByTime(10);

    // Test that button effects are working
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "offsetX", { value: 5 });
    Object.defineProperty(event, "offsetY", { value: 10 });
    button.dispatchEvent(event);

    const ripple = button.querySelector("span.ripple");
    expect(ripple).toBeTruthy();
    expect(ripple.style.left).toBe("5px");
    expect(ripple.style.top).toBe("10px");
  });

  it("initializes immediately when DOM is already loaded", async () => {
    const button = document.createElement("button");
    document.body.appendChild(button);

    vi.useFakeTimers();

    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true
    });

    await import("../../src/helpers/setupBottomNavbar.js");

    vi.advanceTimersByTime(10);

    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "offsetX", { value: 1 });
    Object.defineProperty(event, "offsetY", { value: 2 });
    button.dispatchEvent(event);

    const ripple = button.querySelector("span.ripple");
    expect(ripple).toBeTruthy();
    expect(ripple.style.left).toBe("1px");
    expect(ripple.style.top).toBe("2px");
  });

  it("does not throw if .bottom-navbar is missing", async () => {
    document.body.innerHTML = ""; // Remove navbar
    await import("../../src/helpers/setupBottomNavbar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    // Should not throw
  });

  it("does not throw if there are no buttons in the DOM", async () => {
    // Only navbar, no buttons
    await import("../../src/helpers/setupBottomNavbar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    // Should not throw
  });

  it("does not throw if fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    await import("../../src/helpers/setupBottomNavbar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    // Should not throw
  });
});
