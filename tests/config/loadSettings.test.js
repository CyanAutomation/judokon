import { describe, it, expect, afterEach, vi } from "vitest";
import { withAllowedConsole } from "../utils/console.js";

/**
 * @fileoverview
 * Tests for loadSettings verifying precedence and merge behavior.
 */

describe("loadSettings", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("applies precedence defaults < repo JSON < localStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sound: false, typewriterEffect: true })
      })
    );
    localStorage.setItem("settings", JSON.stringify({ sound: true }));
    const { loadSettings } = await import("../../src/config/loadSettings.js");
    const settings = await loadSettings();
    expect(settings.sound).toBe(true);
    expect(settings.typewriterEffect).toBe(true);
    expect(settings.motionEffects).toBe(true);
  });

  it("ignores localStorage with invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sound: false })
      })
    );
    localStorage.setItem("settings", "{ not valid");
    const { loadSettings } = await import("../../src/config/loadSettings.js");
    const settings = await loadSettings();
    expect(settings.sound).toBe(false);
  });

  it.each([
    {
      source: "localStorage",
      setup: () => {
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
        );
        localStorage.setItem("settings", JSON.stringify({ bogus: true }));
      }
    },
    {
      source: "fetched settings",
      setup: () => {
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ bogus: true })
          })
        );
      }
    }
  ])("drops unknown keys from %s and warns", async ({ setup }) => {
    await withAllowedConsole(async () => {
      setup();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { loadSettings } = await import("../../src/config/loadSettings.js");
      const settings = await loadSettings();
      expect(settings.bogus).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith('Unknown setting "bogus" ignored');
      warnSpy.mockRestore();
    }, ["warn"]);
  });

  it("deeply merges nested objects and replaces arrays", async () => {
    vi.doMock("../../src/config/settingsDefaults.js", () => ({
      DEFAULT_SETTINGS: { items: [1], nested: { a: 1, arr: [1] } }
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [2, 3], nested: { b: 2, arr: [2] } })
      })
    );
    localStorage.setItem("settings", JSON.stringify({ nested: { arr: [3] } }));
    const { loadSettings } = await import("../../src/config/loadSettings.js");
    const settings = await loadSettings();
    expect(settings).toEqual({ items: [2, 3], nested: { a: 1, b: 2, arr: [3] } });
  });

  it("allows nested overrides with unknown keys", async () => {
    await withAllowedConsole(async () => {
      vi.doMock("../../src/config/settingsDefaults.js", () => ({
        DEFAULT_SETTINGS: { nested: { a: 1 } }
      }));
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ nested: { b: 2 } })
        })
      );
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { loadSettings } = await import("../../src/config/loadSettings.js");
      const settings = await loadSettings();
      expect(settings.nested).toEqual({ a: 1, b: 2 });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    }, ["warn"]);
  });
});
