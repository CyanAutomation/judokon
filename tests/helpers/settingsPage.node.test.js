import { describe, it, expect, vi } from "vitest";

describe("settingsPage module - environment compatibility", () => {
  it("resolves readiness promise immediately when DOM is unavailable", async () => {
    vi.resetModules();
    vi.stubGlobal("document", undefined);
    vi.stubGlobal("window", undefined);

    try {
      const { settingsReadyPromise } = await import("../../src/helpers/settingsPage.js");

      await expect(settingsReadyPromise).resolves.toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
