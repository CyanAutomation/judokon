import { describe, it, expect, vi } from "vitest";

const MODULE_PATH = "../../src/helpers/modalManager.js";

describe("modal manager environment guards", () => {
  it("does not throw when document is undefined", async () => {
    vi.resetModules();
    vi.stubGlobal("document", undefined);

    try {
      const modalModule = await import(MODULE_PATH);
      expect(modalModule).toBeDefined();
      expect(typeof modalModule.registerModal).toBe("function");
      expect(typeof modalModule.unregisterModal).toBe("function");
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it("does not throw when document is null", async () => {
    vi.resetModules();
    vi.stubGlobal("document", null);

    try {
      const modalModule = await import(MODULE_PATH);
      expect(modalModule).toBeDefined();
      expect(typeof modalModule.registerModal).toBe("function");
      expect(typeof modalModule.unregisterModal).toBe("function");
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
