import { describe, it, expect, beforeEach, vi } from "vitest";
import { shouldReduceMotionSync, applyMotionPreference } from "../../src/helpers/motionUtils.js";
import { loadSettings, resetSettings } from "../../src/helpers/settingsStorage.js";

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
  beforeEach(async () => {
    resetSettings();
    localStorage.clear();
    document.body.className = "";
    await loadSettings();
  });

  it("returns true when matchMedia prefers reduced motion", () => {
    window.matchMedia = matchMediaMock(true);
    expect(shouldReduceMotionSync()).toBe(true);
  });

  it("returns true when settings disable motion effects", () => {
    window.matchMedia = matchMediaMock(false);
    localStorage.setItem("settings", JSON.stringify({ motionEffects: false }));
    return loadSettings().then(() => {
      expect(shouldReduceMotionSync()).toBe(true);
    });
  });

  it("returns false when motion is enabled and no media preference", async () => {
    window.matchMedia = matchMediaMock(false);
    localStorage.setItem("settings", JSON.stringify({ motionEffects: true }));
    await loadSettings();
    expect(shouldReduceMotionSync()).toBe(false);
  });

  it("handles invalid stored settings gracefully", async () => {
    window.matchMedia = matchMediaMock(true);
    localStorage.setItem("settings", "not json");
    await loadSettings();
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
