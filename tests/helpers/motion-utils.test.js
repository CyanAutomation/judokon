import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { shouldReduceMotionSync, applyMotionPreference } from "../../src/helpers/motionUtils.js";

const matchMediaMock = (matches) =>
  vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));

describe("motionUtils", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.body.className = "";
  });

  it("returns true when matchMedia prefers reduced motion", () => {
    window.matchMedia = matchMediaMock(true);
    expect(shouldReduceMotionSync()).toBe(true);
  });

  it("returns true when settings disable motion effects", () => {
    window.matchMedia = matchMediaMock(false);
    localStorage.setItem("settings", JSON.stringify({ motionEffects: false }));
    expect(shouldReduceMotionSync()).toBe(true);
  });

  it("returns false when motion is enabled and no media preference", () => {
    window.matchMedia = matchMediaMock(false);
    localStorage.setItem("settings", JSON.stringify({ motionEffects: true }));
    expect(shouldReduceMotionSync()).toBe(false);
  });

  it("handles invalid stored settings gracefully", () => {
    window.matchMedia = matchMediaMock(true);
    localStorage.setItem("settings", "not json");
    expect(shouldReduceMotionSync()).toBe(true);
  });

  it("falls back to media query when no settings present", () => {
    window.matchMedia = matchMediaMock(false);
    expect(shouldReduceMotionSync()).toBe(false);
  });

  it("toggles reduce-motion class on body", () => {
    applyMotionPreference(false);
    expect(document.body.classList.contains("reduce-motion")).toBe(true);
    applyMotionPreference(true);
    expect(document.body.classList.contains("reduce-motion")).toBe(false);
  });
});
