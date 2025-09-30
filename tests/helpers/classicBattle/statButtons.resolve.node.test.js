import { describe, it, expect, vi } from "vitest";
import { resolveStatButtonsReady } from "../../../src/helpers/classicBattle/statButtons.js";

describe("resolveStatButtonsReady in non-browser environments", () => {
  it("does not throw when window is unavailable", () => {
    const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
    const originalWindow = globalThis.window;

    try {
      if (hadWindow) {
        delete globalThis.window;
      }

      expect(() => resolveStatButtonsReady()).not.toThrow();
    } finally {
      if (hadWindow) {
        globalThis.window = originalWindow;
      } else {
        delete globalThis.window;
      }
    }
  });

  it("works correctly with explicit window parameter", () => {
    const mockWindow = {};
    const mockResolver = vi.fn();

    mockWindow.__resolveStatButtonsReady = mockResolver;
    expect(() => resolveStatButtonsReady(mockWindow)).not.toThrow();
    expect(mockResolver).toHaveBeenCalledOnce();

    delete mockWindow.__resolveStatButtonsReady;
    expect(() => resolveStatButtonsReady(mockWindow)).not.toThrow();
    expect(mockWindow.statButtonsReadyPromise).toBeInstanceOf(Promise);
  });

  it("handles null and undefined parameters gracefully", () => {
    expect(() => resolveStatButtonsReady(null)).not.toThrow();
    expect(() => resolveStatButtonsReady(undefined)).not.toThrow();
  });
});
