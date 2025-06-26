import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("setupBottomNavbar module", () => {
  beforeEach(() => {
    // Mock fetch to prevent actual network calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    // Clear DOM
    document.body.innerHTML = "";

    // Add required DOM elements
    const navbar = document.createElement("nav");
    navbar.className = "bottom-navbar";
    document.body.appendChild(navbar);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("sets up both navbar and button effects when DOM is loaded", async () => {
    // Create a button to test button effects
    const button = document.createElement("button");
    document.body.appendChild(button);

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
});
