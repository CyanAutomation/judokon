import { describe, it, expect, beforeEach } from "vitest";
import { shouldEnableTypewriter } from "../../src/helpers/typewriter.js";
import { loadSettings, saveSettings } from "../../src/helpers/settingsStorage.js";
import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";

// Tests for typewriter helper

describe("typewriter", () => {
  beforeEach(async () => {
    localStorage.clear();
    await saveSettings(DEFAULT_SETTINGS);
    await loadSettings();
  });

  it("returns false when disabled by default", () => {
    expect(shouldEnableTypewriter()).toBe(false);
  });

  it("returns true when setting enabled", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, typewriterEffect: true });
    expect(shouldEnableTypewriter()).toBe(true);
  });

  it("uses cached settings synchronously", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, typewriterEffect: true });
    expect(shouldEnableTypewriter()).toBe(true);
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));
    expect(shouldEnableTypewriter()).toBe(true);
  });
});
