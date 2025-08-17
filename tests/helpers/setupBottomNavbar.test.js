import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(document, "readyState");

vi.mock("../../src/helpers/navigation/navData.js", () => ({
  loadMenuModes: vi.fn().mockResolvedValue([])
}));

vi.mock("../../src/helpers/api/navigation.js", async () => {
  const actual = await vi.importActual("../../src/helpers/api/navigation.js");
  return {
    ...actual,
    buildMenu: vi.fn()
  };
});

describe("setupBottomNavbar module", () => {
  beforeEach(() => {
    vi.resetModules();
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: false,
      media: q,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    document.body.innerHTML = `
      <nav class="bottom-navbar">
        <ul>
          <li><a href="#" data-testid="nav-1">Home</a></li>
        </ul>
      </nav>
      <button id="test-btn"></button>
    `;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalReadyStateDescriptor) {
      Object.defineProperty(document, "readyState", originalReadyStateDescriptor);
    }
    document.body.innerHTML = "";
  });

  it("initializes button effects and hamburger menu", async () => {
    window.innerWidth = 320;
    await import("../../src/helpers/setupBottomNavbar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    vi.advanceTimersByTime(0);

    const button = document.getElementById("test-btn");
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "offsetX", { value: 5 });
    Object.defineProperty(event, "offsetY", { value: 10 });
    button.dispatchEvent(event);
    const ripple = button.querySelector("span.ripple");
    expect(ripple).toBeTruthy();
    expect(ripple.style.left).toBe("5px");
    expect(ripple.style.top).toBe("10px");

    const toggle = document.querySelector(".nav-toggle");
    const list = document.querySelector(".bottom-navbar ul");
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.dispatchEvent(new Event("click"));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(list.classList.contains("expanded")).toBe(true);
  });

  it("retains nav-toggle class after initialization", async () => {
    window.innerWidth = 320;
    await import("../../src/helpers/setupBottomNavbar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    vi.advanceTimersByTime(0);

    const toggle = document.querySelector("button[aria-label='Menu']");
    expect(toggle).toBeTruthy();
    expect(toggle.classList.contains("nav-toggle")).toBe(true);
  });

  it("does not insert hamburger menu above breakpoint", async () => {
    window.innerWidth = 1024;
    await import("../../src/helpers/setupBottomNavbar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    vi.advanceTimersByTime(0);
    expect(document.querySelector(".nav-toggle")).toBeNull();
  });

  it("does not throw if .bottom-navbar is missing", async () => {
    document.body.innerHTML = "";
    window.innerWidth = 320;
    await import("../../src/helpers/setupBottomNavbar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
  });
});
