import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerClassicBattleModule,
  registerClassicBattleModuleLoader,
  getClassicBattleModule,
  getClassicBattleModuleLoader,
  getClassicBattleModuleSource,
  loadClassicBattleModule,
  resetClassicBattlePreloadRegistry
} from "../../../setup/classicBattlePreloadRegistry.js";

describe("Classic Battle Preload Registry", () => {
  beforeEach(() => {
    resetClassicBattlePreloadRegistry();
    vi.clearAllMocks();
  });

  describe("Cache Management", () => {
    it("should register and retrieve cached modules", () => {
      const mockModule = { ready: true };
      registerClassicBattleModule("mockModule", mockModule);

      expect(getClassicBattleModule("mockModule")).toBe(mockModule);
    });

    it("should handle cache operations gracefully", () => {
      expect(getClassicBattleModule("nonexistent")).toBeNull();
      expect(getClassicBattleModuleLoader("nonexistent")).toBeNull();
      expect(getClassicBattleModuleSource("nonexistent")).toBe("unknown");
    });
  });

  describe("Loader Registration", () => {
    it("should register loaders and load modules once", async () => {
      const loader = vi.fn(async () => ({ id: "lazy" }));
      registerClassicBattleModuleLoader("lazyModule", loader, {
        source: "test-source"
      });

      expect(getClassicBattleModuleLoader("lazyModule")).toBe(loader);
      expect(getClassicBattleModuleSource("lazyModule")).toBe("test-source");

      const loadedModule = await loadClassicBattleModule("lazyModule");
      expect(loadedModule).toEqual({ id: "lazy" });
      expect(loader).toHaveBeenCalledTimes(1);

      const cachedModule = await loadClassicBattleModule("lazyModule");
      expect(cachedModule).toEqual({ id: "lazy" });
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it("should return null when loaders are missing", async () => {
      await expect(loadClassicBattleModule("unknown")).resolves.toBeNull();
    });
  });

  describe("Defaults", () => {
    it("should restore default loaders on reset", () => {
      resetClassicBattlePreloadRegistry();
      const loader = getClassicBattleModuleLoader("battleEngine");

      expect(typeof loader).toBe("function");
      expect(getClassicBattleModuleSource("battleEngine")).toContain("BattleEngine");
    });
  });
});
