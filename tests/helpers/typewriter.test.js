import { describe, it, expect, beforeEach } from "vitest";
import { shouldEnableTypewriter } from "../../src/helpers/typewriter.js";
import { loadSettings, resetSettings, updateSetting } from "../../src/helpers/settingsStorage.js";

// Tests for typewriter helper

describe("typewriter", () => {
  beforeEach(async () => {
    resetSettings();
    localStorage.clear();
    await loadSettings();
  });

  it("returns false when disabled by default", () => {
    expect(shouldEnableTypewriter()).toBe(false);
  });

  it("returns true when setting enabled", async () => {
    await updateSetting("typewriterEffect", true);
    expect(shouldEnableTypewriter()).toBe(true);
  });

  it("uses cached settings synchronously", async () => {
    await updateSetting("typewriterEffect", true);
    expect(shouldEnableTypewriter()).toBe(true);
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));
    expect(shouldEnableTypewriter()).toBe(true);
  });
});
