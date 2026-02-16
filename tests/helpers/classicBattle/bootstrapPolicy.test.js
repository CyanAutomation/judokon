import { describe, expect, it, vi } from "vitest";

import {
  buildBootstrapConfig,
  persistCliSeed,
  readStoredPointsToWin,
  resolveSeedPolicy,
  toPositiveInteger
} from "../../../src/helpers/classicBattle/bootstrapPolicy.js";

describe("bootstrapPolicy", () => {
  it("toPositiveInteger accepts positive integers and rejects invalid values", () => {
    expect(toPositiveInteger(4)).toBe(4);
    expect(toPositiveInteger("9")).toBe(9);
    expect(toPositiveInteger(0)).toBeNull();
    expect(toPositiveInteger(-3)).toBeNull();
    expect(toPositiveInteger(2.5)).toBeNull();
    expect(toPositiveInteger("x")).toBeNull();
  });

  it("readStoredPointsToWin returns found value when storage contains valid integer", () => {
    const storage = { getItem: vi.fn().mockReturnValue("5") };

    const result = readStoredPointsToWin(storage);

    expect(result).toEqual({ found: true, value: 5 });
  });

  it("readStoredPointsToWin handles storage exceptions", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("denied");
      })
    };

    const result = readStoredPointsToWin(storage);

    expect(result.found).toBe(false);
    expect(result).toHaveProperty("error");
  });

  it("resolveSeedPolicy prioritizes query seed over stored seed", () => {
    const storage = { getItem: vi.fn().mockReturnValue("999") };

    const result = resolveSeedPolicy({ search: "?seed=123", storage });

    expect(result).toEqual({ seed: 123, source: "query" });
  });

  it("resolveSeedPolicy falls back to stored seed", () => {
    const storage = { getItem: vi.fn().mockReturnValue("77") };

    const result = resolveSeedPolicy({ search: "", storage });

    expect(result).toEqual({ seed: 77, source: "storage" });
  });

  it("buildBootstrapConfig merges debug hooks and normalizes values", () => {
    const getStateSnapshot = vi.fn();

    const config = buildBootstrapConfig({
      engineConfig: {
        mode: "cli",
        debugHooks: { traceRound: vi.fn() }
      },
      getStateSnapshot,
      pointsToWin: "6",
      seed: "2",
      forceCreate: true
    });

    expect(config.mode).toBe("cli");
    expect(config.pointsToWin).toBe(6);
    expect(config.seed).toBe(2);
    expect(config.forceCreate).toBe(true);
    expect(config.debugHooks.getStateSnapshot).toBe(getStateSnapshot);
    expect(typeof config.debugHooks.traceRound).toBe("function");
  });

  it("persistCliSeed stores valid values and clears invalid values", () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };

    persistCliSeed(42, storage);
    persistCliSeed("invalid", storage);

    expect(storage.setItem).toHaveBeenCalledWith("battleCLI.seed", "42");
    expect(storage.removeItem).toHaveBeenCalledWith("battleCLI.seed");
  });
});
