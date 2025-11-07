const moduleCache = new Map();
const moduleLoaders = new Map();
const moduleMetadata = new Map();

/**
 * Register an already resolved module with the classic battle preload registry.
 *
 * @param {string} cacheKey - Identifier used by preloadService caches.
 * @param {any} module - Module namespace or synthetic export bag.
 * @returns {void}
 */
export function registerClassicBattleModule(cacheKey, module) {
  if (!cacheKey || module === undefined) return;
  moduleCache.set(cacheKey, module);
}

/**
 * Register a lazy loader used to resolve a module on demand.
 *
 * @param {string} cacheKey - Identifier used by preloadService caches.
 * @param {() => Promise<any>} loader - Function that resolves the module namespace.
 * @param {{ source?: string }} [metadata] - Optional loader metadata for diagnostics.
 * @returns {void}
 */
export function registerClassicBattleModuleLoader(cacheKey, loader, metadata = {}) {
  if (typeof cacheKey !== "string" || typeof loader !== "function") return;
  moduleLoaders.set(cacheKey, loader);
  if (metadata && typeof metadata.source === "string") {
    moduleMetadata.set(cacheKey, metadata.source);
  }
}

/**
 * Retrieve a cached module when available.
 *
 * @param {string} cacheKey - Module identifier.
 * @returns {any|null}
 */
export function getClassicBattleModule(cacheKey) {
  return moduleCache.get(cacheKey) ?? null;
}

/**
 * Resolve the configured loader for a cache key.
 *
 * @param {string} cacheKey - Module identifier.
 * @returns {(() => Promise<any>)|null}
 */
export function getClassicBattleModuleLoader(cacheKey) {
  return moduleLoaders.get(cacheKey) ?? null;
}

/**
 * Return a best-effort identifier for diagnostics/logging.
 *
 * @param {string} cacheKey - Module identifier.
 * @returns {string}
 */
export function getClassicBattleModuleSource(cacheKey) {
  if (moduleMetadata.has(cacheKey)) {
    return moduleMetadata.get(cacheKey);
  }
  const loader = moduleLoaders.get(cacheKey);
  if (loader) return cacheKey;
  return "unknown";
}

/**
 * Load a module using the registered loader and cache the result.
 *
 * @param {string} cacheKey - Module identifier.
 * @returns {Promise<any|null>}
 */
export async function loadClassicBattleModule(cacheKey) {
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey);
  }
  const loader = moduleLoaders.get(cacheKey);
  if (typeof loader !== "function") {
    return null;
  }
  const module = await loader();
  moduleCache.set(cacheKey, module);
  return module;
}

/**
 * Reset the module cache. Primarily used in tests.
 *
 * @returns {void}
 */
export function resetClassicBattlePreloadRegistry() {
  moduleCache.clear();
  moduleLoaders.clear();
  moduleMetadata.clear();
  registerDefaultClassicBattleLoaders();
}

const DEFAULT_LOADERS = [
  [
    "battleEngine",
    () => import("../src/helpers/battleEngineFacade.js"),
    "../src/helpers/battleEngineFacade.js"
  ],
  [
    "scoreboard",
    () => import("../src/helpers/setupScoreboard.js"),
    "../src/helpers/setupScoreboard.js"
  ],
  [
    "cooldownRenderer",
    () => import("../src/helpers/CooldownRenderer.js"),
    "../src/helpers/CooldownRenderer.js"
  ],
  [
    "debugPanel",
    () => import("../src/helpers/classicBattle/debugPanel.js"),
    "../src/helpers/classicBattle/debugPanel.js"
  ],
  [
    "computeCooldown",
    () => import("../src/helpers/timers/computeNextRoundCooldown.js"),
    "../src/helpers/timers/computeNextRoundCooldown.js"
  ],
  [
    "createRoundTimer",
    () => import("../src/helpers/timers/createRoundTimer.js"),
    "../src/helpers/timers/createRoundTimer.js"
  ]
];

function registerDefaultClassicBattleLoaders() {
  for (const [cacheKey, loader, source] of DEFAULT_LOADERS) {
    registerClassicBattleModuleLoader(cacheKey, loader, { source });
  }
}

registerDefaultClassicBattleLoaders();
