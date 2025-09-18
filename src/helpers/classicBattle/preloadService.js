import { runWhenIdle } from "./idleCallback.js";

const cachedModules = new Map();
const preloadPromises = new Map();
const cleanupRegistry = new Set();

const supportsWeakRef = typeof WeakRef === "function";
const supportsFinalizationRegistry = typeof FinalizationRegistry === "function";

const weakReferenceRegistry = new Set();
const pendingFinalizationRecords = new Set();

const finalizationRegistry =
  supportsWeakRef && supportsFinalizationRegistry
    ? new FinalizationRegistry((record) => {
        pendingFinalizationRecords.add(record);
        scheduleCleanupTask(() => cleanupWeakReferenceRecord(record));
      })
    : null;

/**
 * Preload service for lazy loading heavy modules during idle time.
 *
 * This se/**
 * Register a cleanup function for memory management.
 *
 * @pseudocode
 * 1. Validate that the cleanup function is actually a function.
 * 2. Add the cleanup function to the cleanup registry Set.
 * 3. This ensures cleanup functions can be called during memory cleanup.
 *
 * @param {Function} cleanupFn - Cleanup function to register
 * @returns {void}
 */
export function registerCleanup(cleanupFn) {
  if (typeof cleanupFn === "function") {
    cleanupRegistry.add(cleanupFn);
  }
}

/**
 * Schedule a cleanup task in a microtask-safe way.
 *
 * @param {Function} task - Task to schedule
 * @returns {void}
 */
function scheduleCleanupTask(task) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(task);
    return;
  }

  Promise.resolve()
    .then(task)
    .catch(() => {
      /* no-op */
    });
}

/**
 * Execute cleanup logic for a weak reference record.
 *
 * @param {object} record - Internal weak reference record
 * @returns {void}
 */
function cleanupWeakReferenceRecord(record) {
  if (!record) {
    return;
  }

  if (record.cleaned) {
    pendingFinalizationRecords.delete(record);
    weakReferenceRegistry.delete(record);
    return;
  }

  record.cleaned = true;

  try {
    record.cleanupFn();
  } catch (error) {
    console.warn("Failed to run weak reference cleanup:", error);
  }

  if (finalizationRegistry && record.token) {
    finalizationRegistry.unregister(record.token);
  }

  record.weakRef = null;
  record.token = null;

  pendingFinalizationRecords.delete(record);
  weakReferenceRegistry.delete(record);
}

/**
 * Register a cleanup callback tied to a weak reference target.
 *
 * @pseudocode
 * 1. Verify the target is an object/function and cleanupFn is a function.
 * 2. Create an internal record with bookkeeping flags and weak reference if supported.
 * 3. Register the record with the FinalizationRegistry when available.
 * 4. Store the record so performMemoryCleanup can execute the cleanup manually.
 *
 * @param {object|Function} target - Target associated with the weak reference
 * @param {Function} cleanupFn - Callback to invoke on cleanup
 * @returns {void}
 */
export function registerWeakReference(target, cleanupFn) {
  const isObjectTarget =
    (typeof target === "object" && target !== null) || typeof target === "function";

  if (!isObjectTarget || typeof cleanupFn !== "function") {
    return;
  }

  const record = {
    cleanupFn,
    cleaned: false,
    weakRef: supportsWeakRef ? new WeakRef(target) : null,
    token: finalizationRegistry ? {} : null
  };

  if (finalizationRegistry) {
    finalizationRegistry.register(target, record, record.token);
  }

  weakReferenceRegistry.add(record);
}

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
/**
 * Get performance metrics for preload service monitoring.
 *
 * @pseudocode
 * 1. Return a copy of performance metrics object.
 * 2. Calculate cache hit rate as hits divided by total requests.
 * 3. Calculate average load time across all cached modules.
 * 4. Return metrics with computed values for monitoring.
 *
 * @returns {object} Performance metrics including hit rate and average load time
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
 *
 * @pseudocode
 * 1. Check if performance.memory API is available.
 * 2. Create memory snapshot with timestamp and heap sizes.
 * 3. Push snapshot to performance metrics memory usage array.
 * 4. This enables tracking memory usage over time for optimization.
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
 * Get a cached module if available.
 *
 * @param {string} cacheKey - Key of the cached module
 * @returns {object|null} The cached module or null if not loaded
 */
/**
 * Get a cached module by its cache key.
 *
 * @pseudocode
 * 1. Look up the module in the cachedModules Map using the cache key.
 * 2. Return the cached module if found, otherwise return null.
 * 3. This provides fast access to preloaded modules without re-importing.
 *
 * @param {string} cacheKey - The key used to cache the module
 * @returns {object|null} The cached module or null if not found
 */
export function getCachedModule(cacheKey) {
  return cachedModules.get(cacheKey) || null;
}

/**
 * Perform memory cleanup by clearing weak references and running cleanup functions.
 *
 * @pseudocode
 * 1. Iterate through all registered cleanup functions and execute them safely.
 * 2. Run any pending finalization callbacks queued by the FinalizationRegistry.
 * 3. Execute cleanup for all tracked weak reference records as a fallback.
 * 4. Record current memory usage after cleanup completes.
 * 5. Clear registries to prevent duplicate executions and release references.
 *
 * @returns {void}
 */
export function performMemoryCleanup() {
  // Process explicit cleanup callbacks first
  for (const cleanupFn of cleanupRegistry) {
    try {
      cleanupFn();
    } catch (error) {
      console.warn("Failed to run cleanup function:", error);
    }
  }
  cleanupRegistry.clear();

  for (const record of pendingFinalizationRecords) {
    cleanupWeakReferenceRecord(record);
  }
  pendingFinalizationRecords.clear();

  for (const record of weakReferenceRegistry) {
    cleanupWeakReferenceRecord(record);
  }
  weakReferenceRegistry.clear();

  recordMemoryUsage();
}

/**
 * Preload battle engine facade during idle time.
 *
 * The battle engine is heavy and only needed when battles start,
 * so we preload it during idle periods.
 *
 * @pseudocode
 * 1. Schedule module preload to run during browser idle time.
 * 2. Preload the battle engine facade module with cache key "battleEngine".
 * 3. This ensures the heavy battle engine is ready when needed without blocking initial load.
 *
 * @returns {void}
 */
export function preloadBattleEngine() {
  runWhenIdle(() => preloadModule("../battleEngineFacade.js", "battleEngine"));
}

/**
 * Preload scoreboard setup during idle time.
 *
 * Scoreboard setup involves DOM manipulation and is only needed
 * when battles are active.
 *
 * @pseudocode
 * 1. Schedule module preload to run during browser idle time.
 * 2. Preload the scoreboard setup module with cache key "scoreboard".
 * 3. This ensures scoreboard functionality is ready when battles start.
 *
 * @returns {void}
 */
export function preloadScoreboard() {
  runWhenIdle(() => preloadModule("../setupScoreboard.js", "scoreboard"));
}

/**
 * Preload cooldown renderer during idle time.
 *
 * Cooldown rendering involves UI updates and snackbar management,
 * only needed during active battle cooldowns.
 *
 * @pseudocode
 * 1. Schedule module preload to run during browser idle time.
 * 2. Preload the cooldown renderer module with cache key "cooldownRenderer".
 * 3. This ensures cooldown UI is ready when battle cooldowns occur.
 *
 * @returns {void}
 */
export function preloadCooldownRenderer() {
  runWhenIdle(() => preloadModule("../CooldownRenderer.js", "cooldownRenderer"));
}

/**
 * Preload debug panel during idle time.
 *
 * Debug functionality is only needed in development/debugging scenarios.
 *
 * @pseudocode
 * 1. Schedule module preload to run during browser idle time.
 * 2. Preload the debug panel module with cache key "debugPanel".
 * 3. This ensures debug functionality is available when needed for development.
 *
 * @returns {void}
 */
export function preloadDebugPanel() {
  runWhenIdle(() => preloadModule("./debugPanel.js", "debugPanel"));
}

/**
 * Preload timer computation modules during idle time.
 *
 * Timer computations are only needed when rounds start.
 *
 * @pseudocode
 * 1. Schedule module preload to run during browser idle time.
 * 2. Preload multiple timer-related modules in parallel.
 * 3. Cache computeNextRoundCooldown and createRoundTimer modules.
 * 4. This ensures timer functionality is ready when rounds begin.
 *
 * @returns {void}
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
 *
 * @pseudocode
 * 1. Initialize performance monitoring by recording start time.
 * 2. Record initial memory usage for baseline metrics.
 * 3. Start preloading all heavy modules during idle time.
 * 4. Preload battle engine, scoreboard, cooldown renderer, debug panel, and timer modules.
 * 5. This ensures all heavy modules are ready when needed without blocking initial load.
 *
 * @returns {void}
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
 * @pseudocode
 * 1. Check if battle engine is already cached from preload.
 * 2. Return cached module immediately if available.
 * 3. If not cached, perform synchronous import of battle engine facade.
 * 4. Return the loaded module for immediate use.
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
 * @pseudocode
 * 1. Check if scoreboard module is already cached from preload.
 * 2. Return cached module immediately if available.
 * 3. If not cached, perform synchronous import of scoreboard setup.
 * 4. Return the loaded module for immediate use.
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
 * @pseudocode
 * 1. Check if cooldown renderer is already cached from preload.
 * 2. Return cached module immediately if available.
 * 3. If not cached, perform synchronous import of cooldown renderer.
 * 4. Return the loaded module for immediate use.
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
 * @pseudocode
 * 1. Check if debug panel is already cached from preload.
 * 2. Return cached module immediately if available.
 * 3. If not cached, perform synchronous import of debug panel.
 * 4. Return the loaded module for immediate use.
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
 * @pseudocode
 * 1. Check cache for both timer modules (computeCooldown and createRoundTimer).
 * 2. Return cached modules immediately if both are available.
 * 3. Load any missing modules synchronously using Promise.all.
 * 4. Return object containing both timer modules.
 * 5. This ensures both timer modules are available when needed.
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
 *
 * @pseudocode
 * 1. Perform memory cleanup to run registered cleanup functions.
 * 2. Clear the cached modules Map to free memory.
 * 3. Clear the preload promises Map to reset preload state.
 * 4. This ensures a clean state for testing or memory management.
 *
 * @returns {void}
 */
export function clearPreloadCache() {
  // Perform memory cleanup before clearing cache
  performMemoryCleanup();

  cachedModules.clear();
  preloadPromises.clear();
}
