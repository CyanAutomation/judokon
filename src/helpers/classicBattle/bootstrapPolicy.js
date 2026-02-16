import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";

const CLI_SEED_STORAGE_KEY = "battleCLI.seed";

export function toPositiveInteger(value) {
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0;
  return valid ? parsed : null;
}

export function readStoredPointsToWin(storage = globalThis?.localStorage) {
  try {
    if (!storage || typeof storage.getItem !== "function") {
      return { found: false };
    }
    const parsed = toPositiveInteger(storage.getItem(BATTLE_POINTS_TO_WIN));
    return parsed === null ? { found: false } : { found: true, value: parsed };
  } catch (error) {
    return { found: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export function resolveSeedPolicy({ search = "", storage = globalThis?.localStorage } = {}) {
  let seedParam = null;
  let storedSeed = null;
  try {
    seedParam = new URLSearchParams(search).get("seed");
    storedSeed = storage?.getItem?.(CLI_SEED_STORAGE_KEY) ?? null;
  } catch {}

  const querySeed = seedParam === null || seedParam === "" ? null : toPositiveInteger(seedParam);
  if (querySeed !== null) {
    return { seed: querySeed, source: "query" };
  }

  const persistedSeed = toPositiveInteger(storedSeed);
  return persistedSeed === null
    ? { seed: null, source: null }
    : { seed: persistedSeed, source: "storage" };
}

export function buildBootstrapConfig({
  engineConfig = {},
  getStateSnapshot,
  pointsToWin,
  seed,
  forceCreate
} = {}) {
  const config = {
    ...engineConfig,
    debugHooks: { ...(engineConfig.debugHooks ?? {}), getStateSnapshot }
  };
  const normalizedPointsToWin = toPositiveInteger(pointsToWin);
  const normalizedSeed = toPositiveInteger(seed);
  if (normalizedPointsToWin !== null) {
    config.pointsToWin = normalizedPointsToWin;
  }
  if (normalizedSeed !== null) {
    config.seed = normalizedSeed;
  }
  if (forceCreate === true) {
    config.forceCreate = true;
  }
  return config;
}

export function persistCliSeed(seed, storage = globalThis?.localStorage) {
  try {
    if (toPositiveInteger(seed) === null) {
      storage?.removeItem?.(CLI_SEED_STORAGE_KEY);
      return;
    }
    storage?.setItem?.(CLI_SEED_STORAGE_KEY, String(seed));
  } catch {}
}
