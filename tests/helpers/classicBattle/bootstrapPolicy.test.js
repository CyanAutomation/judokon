import { describe, expect, it, vi } from "vitest";

import {
  BATTLE_SEED_STORAGE_KEY,
  buildBootstrapConfig,
  persistCliSeed,
  readStoredPointsToWin,
  resolveBattleSeed,
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

  it("resolveBattleSeed prioritizes query seed over stored seed", () => {
    const storage = { getItem: vi.fn().mockReturnValue("999") };

    const result = resolveBattleSeed({ search: "?seed=123", storage });

    expect(result).toEqual({ seed: 123, source: "query" });
  });

  it("resolveBattleSeed falls back to stored seed", () => {
    const storage = { getItem: vi.fn().mockReturnValue("77") };

    const result = resolveBattleSeed({ search: "", storage });

    expect(result).toEqual({ seed: 77, source: "storage" });
  });

  it("resolveBattleSeed yields identical deterministic sequence for query and storage sources", async () => {
    const { seededRandom, setTestMode } = await import("../../../src/helpers/testModeUtils.js");

    const queryPolicy = resolveBattleSeed({ search: "?seed=314", storage: { getItem: vi.fn() } });
    const storagePolicy = resolveBattleSeed({
      search: "",
      storage: { getItem: vi.fn().mockReturnValue("314") }
    });

    setTestMode({ enabled: true, seed: queryPolicy.seed });
    const querySequence = [seededRandom(), seededRandom(), seededRandom()];

    setTestMode({ enabled: true, seed: storagePolicy.seed });
    const storageSequence = [seededRandom(), seededRandom(), seededRandom()];

    expect(queryPolicy.source).toBe("query");
    expect(storagePolicy.source).toBe("storage");
    expect(querySequence).toEqual(storageSequence);

    setTestMode({ enabled: false });
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

    expect(storage.setItem).toHaveBeenCalledWith(BATTLE_SEED_STORAGE_KEY, "42");
    expect(storage.removeItem).toHaveBeenCalledWith(BATTLE_SEED_STORAGE_KEY);
  });
});
