import { runWhenIdle } from "./idleCallback.js";

/**
 * Preload service for lazy loading heavy modules during idle time.
 *
 * This service manages the lazy loading of non-critical modules that are
 * used in battle flows but don't need to be loaded immediately on startup.
 * Modules are loaded during browser idle periods to minimize impact on
 * initial page load performance.
 */

let cachedModules = new Map();
let preloadPromises = new Map();

/**
 * Preload a module during idle time and cache the result.
 *
 * @param {string} modulePath - Path to the module to preload
 * @param {string} cacheKey - Key to store the cached module under
 * @returns {Promise<void>} Resolves when preload completes
 */
async function preloadModule(modulePath, cacheKey) {
  if (cachedModules.has(cacheKey) || preloadPromises.has(cacheKey)) {
    return preloadPromises.get(cacheKey);
  }

  const preloadPromise = (async () => {
    try {
      const module = await import(modulePath);
      cachedModules.set(cacheKey, module);
    } catch (error) {
      // Silently fail - preloading is best-effort
      console.warn(`Failed to preload ${modulePath}:`, error);
    }
  })();

  preloadPromises.set(cacheKey, preloadPromise);
  return preloadPromise;
}

/**
 * Get a cached module if available.
 *
 * @param {string} cacheKey - Key of the cached module
 * @returns {object|null} The cached module or null if not loaded
 */
export function getCachedModule(cacheKey) {
  return cachedModules.get(cacheKey) || null;
}

/**
 * Preload battle engine facade during idle time.
 *
 * The battle engine is heavy and only needed when battles start,
 * so we preload it during idle periods.
 */
export function preloadBattleEngine() {
  runWhenIdle(() => preloadModule("../battleEngineFacade.js", "battleEngine"));
}

/**
 * Preload scoreboard setup during idle time.
 *
 * Scoreboard setup involves DOM manipulation and is only needed
 * when battles are active.
 */
export function preloadScoreboard() {
  runWhenIdle(() => preloadModule("../setupScoreboard.js", "scoreboard"));
}

/**
 * Preload cooldown renderer during idle time.
 *
 * Cooldown rendering involves UI updates and snackbar management,
 * only needed during active battle cooldowns.
 */
export function preloadCooldownRenderer() {
  runWhenIdle(() => preloadModule("../CooldownRenderer.js", "cooldownRenderer"));
}

/**
 * Preload debug panel during idle time.
 *
 * Debug functionality is only needed in development/debugging scenarios.
 */
export function preloadDebugPanel() {
  runWhenIdle(() => preloadModule("./debugPanel.js", "debugPanel"));
}

/**
 * Preload timer computation modules during idle time.
 *
 * Timer computations are only needed when rounds start.
 */
export function preloadTimerModules() {
  runWhenIdle(async () => {
    await Promise.all([
      preloadModule("../timers/computeNextRoundCooldown.js", "computeCooldown"),
      preloadModule("../timers/createRoundTimer.js", "createRoundTimer")
    ]);
  });
}

/**
 * Initialize all preload services.
 *
 * This should be called during application startup to begin
 * preloading heavy modules during idle periods.
 */
export function initPreloadServices() {
  // Start preloading heavy modules during idle time
  preloadBattleEngine();
  preloadScoreboard();
  preloadCooldownRenderer();
  preloadDebugPanel();
  preloadTimerModules();
}

/**
 * Get lazy-loaded battle engine if available, otherwise load synchronously.
 *
 * @returns {Promise<object>} The battle engine facade module
 */
export async function getBattleEngineLazy() {
  const cached = getCachedModule("battleEngine");
  if (cached) return cached;

  return await import("../battleEngineFacade.js");
}

/**
 * Get lazy-loaded scoreboard if available, otherwise load synchronously.
 *
 * @returns {Promise<object>} The scoreboard module
 */
export async function getScoreboardLazy() {
  const cached = getCachedModule("scoreboard");
  if (cached) return cached;

  return await import("../setupScoreboard.js");
}

/**
 * Get lazy-loaded cooldown renderer if available, otherwise load synchronously.
 *
 * @returns {Promise<object>} The cooldown renderer module
 */
export async function getCooldownRendererLazy() {
  const cached = getCachedModule("cooldownRenderer");
  if (cached) return cached;

  return await import("../CooldownRenderer.js");
}

/**
 * Get lazy-loaded debug panel if available, otherwise load synchronously.
 *
 * @returns {Promise<object>} The debug panel module
 */
export async function getDebugPanelLazy() {
  const cached = getCachedModule("debugPanel");
  if (cached) return cached;

  return await import("./debugPanel.js");
}

/**
 * Get lazy-loaded timer modules if available, otherwise load synchronously.
 *
 * @returns {Promise<object>} Object containing timer modules
 */
export async function getTimerModulesLazy() {
  const cached = {
    computeCooldown: getCachedModule("computeCooldown"),
    createRoundTimer: getCachedModule("createRoundTimer")
  };

  if (cached.computeCooldown && cached.createRoundTimer) {
    return cached;
  }

  // Load any missing modules
  const [computeCooldown, createRoundTimer] = await Promise.all([
    cached.computeCooldown || import("../timers/computeNextRoundCooldown.js"),
    cached.createRoundTimer || import("../timers/createRoundTimer.js")
  ]);

  return { computeCooldown, createRoundTimer };
}

/**
 * Clear all cached modules (useful for testing or memory cleanup).
 */
export function clearPreloadCache() {
  cachedModules.clear();
  preloadPromises.clear();
}