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

// Performance monitoring
let performanceMetrics = {
  preloadStartTime: null,
  moduleLoadTimes: new Map(),
  cacheHits: 0,
  cacheMisses: 0,
  memoryUsage: []
};

/**
 * Preload a module during idle time and cache the result.
 *
 * @param {string} modulePath - Path to the module to preload
 * @param {string} cacheKey - Key to store the cached module under
 * @returns {Promise<void>} Resolves when preload completes
 */
async function preloadModule(modulePath, cacheKey) {
  if (cachedModules.has(cacheKey) || preloadPromises.has(cacheKey)) {
    performanceMetrics.cacheHits++;
    recordMemoryUsage();
    return preloadPromises.get(cacheKey);
  }

  performanceMetrics.cacheMisses++;
  const startTime = Date.now();

  const preloadPromise = (async () => {
    try {
      const module = await import(modulePath);
      const loadTime = Date.now() - startTime;
      performanceMetrics.moduleLoadTimes.set(cacheKey, loadTime);
      cachedModules.set(cacheKey, module);
      recordMemoryUsage();
    } catch (error) {
      // Silently fail - preloading is best-effort
      console.warn(`Failed to preload ${modulePath}:`, error);
    }
  })();

  preloadPromises.set(cacheKey, preloadPromise);
  return preloadPromise;
}

/**
 * Get performance metrics for lazy loading.
 *
 * @returns {object} Performance metrics
 */
export function getPerformanceMetrics() {
  return {
    ...performanceMetrics,
    cacheHitRate:
      performanceMetrics.cacheHits /
        (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) || 0,
    averageLoadTime:
      Array.from(performanceMetrics.moduleLoadTimes.values()).reduce((sum, time) => sum + time, 0) /
        performanceMetrics.moduleLoadTimes.size || 0
  };
}

/**
 * Record memory usage for monitoring.
 */
function recordMemoryUsage() {
  if (typeof performance !== "undefined" && performance.memory) {
    performanceMetrics.memoryUsage.push({
      timestamp: Date.now(),
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    });

    // Keep only last 100 measurements
    if (performanceMetrics.memoryUsage.length > 100) {
      performanceMetrics.memoryUsage.shift();
    }
  }
}

/**
 * Register a cleanup function for memory management.
 *
 * @param {Function} cleanupFn - Cleanup function to register
 */
export function registerCleanup(cleanupFn) {
  if (typeof cleanupFn === "function") {
    cleanupRegistry.add(cleanupFn);
  }
}

/**
 * Perform memory cleanup by clearing weak references and running cleanup functions.
 */
export function performMemoryCleanup() {
  // Note: WeakMap doesn't allow iteration, so we can't clean up old entries
  // But we can run registered cleanup functions and record memory usage
  for (const cleanupFn of cleanupRegistry) {
    try {
      cleanupFn();
    } catch (error) {
      console.warn("Failed to run cleanup function:", error);
    }
  }
  recordMemoryUsage();
  cleanupRegistry.clear();
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
  // Initialize performance monitoring
  performanceMetrics.preloadStartTime = Date.now();
  recordMemoryUsage();

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
  // Perform memory cleanup before clearing cache
  performMemoryCleanup();

  cachedModules.clear();
  preloadPromises.clear();
}
