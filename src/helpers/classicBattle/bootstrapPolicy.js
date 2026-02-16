import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";

export const BATTLE_SEED_STORAGE_KEY = "battleCLI.seed";

/**
 * Convert a value to a positive integer when valid.
 *
 * @param {unknown} value - Candidate numeric input.
 * @returns {number | null} Normalized positive integer or null when invalid.
 * @pseudocode
 * coerce input to number
 * verify finite, integer, and greater than zero
 * return normalized integer or null when invalid
 */
export function toPositiveInteger(value) {
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0;
  return valid ? parsed : null;
}

/**
 * Read and validate points-to-win from storage.
 *
 * @param {{ getItem?: (key: string) => string | null } | null | undefined} [storage=globalThis?.localStorage] - Storage provider.
 * @returns {{ found: false, error?: Error } | { found: true, value: number }} Read result containing normalized value when present.
 * @pseudocode
 * if storage/getItem is unavailable return found:false
 * read points key and normalize using toPositiveInteger
 * return found:true with value when valid
 * catch storage errors and return found:false with normalized Error
 */
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

/**
 * Resolve deterministic seed policy from query string or persisted storage.
 *
 * @param {{ search?: string, storage?: { getItem?: (key: string) => string | null } | null }} [options={}] - Query and storage sources.
 * @returns {{ seed: number | null, source: "query" | "storage" | null }} Seed resolution policy.
 * @pseudocode
 * read seed from URL query and CLI seed from storage with safe try/catch
 * normalize query seed and return query policy when valid
 * otherwise normalize persisted seed and return storage policy when valid
 * return null policy when neither source contains a valid positive integer
 */
export function resolveBattleSeed({ search = "", storage = globalThis?.localStorage } = {}) {
  let seedParam = null;
  let storedSeed = null;
  try {
    seedParam = new URLSearchParams(search).get("seed");
    storedSeed = storage?.getItem?.(BATTLE_SEED_STORAGE_KEY) ?? null;
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

/**
 * Backward-compatible alias for deterministic seed resolution.
 *
 * @summary Preserve legacy `resolveSeedPolicy` call sites while routing to `resolveBattleSeed`.
 * @pseudocode
 * delegate to resolveBattleSeed with the same options
 * return the normalized seed policy result unchanged
 *
 * @deprecated Use {@link resolveBattleSeed}.
 */
export const resolveSeedPolicy = resolveBattleSeed;

/**
 * Build normalized bootstrap config for battle engine creation/reset intents.
 *
 * @param {{ engineConfig?: Record<string, unknown>, getStateSnapshot?: (() => unknown) | undefined, pointsToWin?: unknown, seed?: unknown, forceCreate?: boolean }} [options={}] - Input configuration.
 * @returns {Record<string, unknown>} Normalized engine bootstrap configuration.
 * @pseudocode
 * clone incoming engine config and merge debugHooks with getStateSnapshot
 * normalize pointsToWin and seed values
 * conditionally set normalized points/seed on config
 * set forceCreate when explicitly true and return config
 */
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

/**
 * Persist or clear CLI deterministic seed in storage.
 *
 * @param {unknown} seed - Candidate seed value.
 * @param {{ removeItem?: (key: string) => void, setItem?: (key: string, value: string) => void } | null | undefined} [storage=globalThis?.localStorage] - Storage provider.
 * @returns {void}
 * @pseudocode
 * normalize incoming seed
 * if invalid, remove seed key and exit
 * when valid, store normalized seed string in storage
 * swallow storage exceptions to keep UI resilient
 */
export function persistCliSeed(seed, storage = globalThis?.localStorage) {
  try {
    if (toPositiveInteger(seed) === null) {
      storage?.removeItem?.(BATTLE_SEED_STORAGE_KEY);
      return;
    }
    storage?.setItem?.(BATTLE_SEED_STORAGE_KEY, String(seed));
  } catch {}
}
