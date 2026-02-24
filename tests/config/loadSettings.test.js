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
    const defaults = { items: [1], nested: { a: 1, b: 0, arr: [1] } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [2, 3], nested: { b: 2, arr: [2] } })
      })
    );
    localStorage.setItem("settings", JSON.stringify({ nested: { arr: [3] } }));
    const { loadSettings } = await import("../../src/config/loadSettings.js");
    const settings = await loadSettings({ defaults });
    expect(settings).toEqual({ items: [2, 3], nested: { a: 1, b: 2, arr: [3] } });
  });

  it("drops unknown nested keys from fetched settings and localStorage", async () => {
    await withAllowedConsole(async () => {
      const defaults = {
        audio: { enabled: true, volume: 0.5 },
        nested: { known: { value: 1 } }
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              audio: { enabled: false, bogus: true },
              nested: { known: { value: 2, surprise: 99 } }
            })
        })
      );
      localStorage.setItem(
        "settings",
        JSON.stringify({
          audio: { volume: 0.9, extra: "ignored" },
          nested: { unknownBranch: { value: 3 } }
        })
      );

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { loadSettings } = await import("../../src/config/loadSettings.js");
      const settings = await loadSettings({ defaults });
      expect(settings).toEqual({
        audio: { enabled: false, volume: 0.9 },
        nested: { known: { value: 2 } }
      });
      expect(warnSpy).toHaveBeenCalledWith('Unknown setting "audio.bogus" ignored');
      expect(warnSpy).toHaveBeenCalledWith('Unknown setting "nested.known.surprise" ignored');
      expect(warnSpy).toHaveBeenCalledWith('Unknown setting "audio.extra" ignored');
      expect(warnSpy).toHaveBeenCalledWith('Unknown setting "nested.unknownBranch" ignored');
      warnSpy.mockRestore();
    }, ["warn"]);
  });

  it("silently ignores legacy featureFlags.roundStore persisted in localStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
    );

    localStorage.setItem(
      "settings",
      JSON.stringify({
        featureFlags: {
          roundStore: { enabled: false }
        }
      })
    );

    await withAllowedConsole(async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { loadSettings } = await import("../../src/config/loadSettings.js");
      const settings = await loadSettings();

      expect(settings.featureFlags.roundStore).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalledWith('Unknown setting "featureFlags.roundStore" ignored');
      warnSpy.mockRestore();
    }, ["warn"]);
  });

  it("silently ignores legacy tooltipIds.roundStore persisted in localStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
    );

    localStorage.setItem(
      "settings",
      JSON.stringify({
        tooltipIds: {
          roundStore: "legacy-tooltip-id"
        }
      })
    );

    await withAllowedConsole(async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { loadSettings } = await import("../../src/config/loadSettings.js");
      const settings = await loadSettings();

      expect(settings.tooltipIds?.roundStore).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalledWith('Unknown setting "tooltipIds.roundStore" ignored');
      warnSpy.mockRestore();
    }, ["warn"]);
  });
});
