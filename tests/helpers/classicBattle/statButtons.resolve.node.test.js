import { describe, it, expect } from "vitest";
import { resolveStatButtonsReady } from "../../../src/helpers/classicBattle/statButtons.js";

describe("resolveStatButtonsReady in non-browser environments", () => {
  it("does not throw when window is unavailable", () => {
    const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
    const originalWindow = globalThis.window;

    if (hadWindow) {
      delete globalThis.window;
    }

    expect(() => resolveStatButtonsReady()).not.toThrow();

    if (hadWindow) {
      globalThis.window = originalWindow;
    } else {
      delete globalThis.window;
    }
  });
});
