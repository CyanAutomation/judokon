/**
 * Validate initialization options
 * @param {Object} opts - Options to validate
 * @throws {TypeError} if options are invalid
 * @pseudocode
 * 1. Check opts is object
 * 2. Check afterMock is boolean if provided
 * 3. Check force is boolean if provided
 * 4. Check timeout is positive number if provided
 * 5. Check debug is boolean if provided
 */
function validateOptions(opts) {
  if (opts === null || typeof opts !== "object") {
    throw new TypeError("Options must be an object");
  }

  if (opts.afterMock !== undefined && typeof opts.afterMock !== "boolean") {
    throw new TypeError("afterMock must be a boolean");
  }

  if (opts.force !== undefined && typeof opts.force !== "boolean") {
    throw new TypeError("force must be a boolean");
  }

  if (opts.timeout !== undefined) {
    if (typeof opts.timeout !== "number" || opts.timeout <= 0) {
      throw new TypeError("timeout must be a positive number");
    }
  }

  if (opts.debug !== undefined && typeof opts.debug !== "boolean") {
    throw new TypeError("debug must be a boolean");
  }
}

const beforeInitHooks = [];
const afterInitHooks = [];
let initInProgress = false;
const pendingInits = [];

/**
 * Perform the actual initialization
 * @param {Object} opts - Options
 * @returns {Promise<Object>} Battle module
 * @pseudocode
 * 1. Import battle module dynamically
 * 2. Extract afterMock flag from options
 * 3. If afterMock and reset function exists, reset bindings
 * 4. If ensure function exists, ensure bindings with force flag
 * 5. Otherwise throw error if ensure function missing
 * 6. Return battle module
 */
async function performInit(opts) {
  const debug = opts.debug || process.env.DEBUG_CLASSIC_BATTLE;

  if (debug) {
    console.log("[initClassicBattleTest] Starting initialization", opts);
  }

  const battleMod = await import("../../src/helpers/classicBattle.js");
  const afterMock = !!opts.afterMock;

  if (debug) {
    console.log("[initClassicBattleTest] Module imported", {
      hasReset: typeof battleMod.__resetClassicBattleBindings === "function",
      hasEnsure: typeof battleMod.__ensureClassicBattleBindings === "function",
      afterMock
    });
  }

  // Verify module has required functions
  if (afterMock && typeof battleMod.__resetClassicBattleBindings !== "function") {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Battle module missing __resetClassicBattleBindings function");
    }
  }

  if (typeof battleMod.__ensureClassicBattleBindings !== "function") {
    throw new Error("Battle module missing __ensureClassicBattleBindings function");
  }

  if (afterMock && typeof battleMod.__resetClassicBattleBindings === "function") {
    if (debug) console.log("[initClassicBattleTest] Resetting bindings");
    await battleMod.__resetClassicBattleBindings();
  }

  if (typeof battleMod.__ensureClassicBattleBindings === "function") {
    if (debug) console.log("[initClassicBattleTest] Ensuring bindings");
    await battleMod.__ensureClassicBattleBindings({ force: afterMock });
  }

  if (debug) {
    console.log("[initClassicBattleTest] Initialization complete");
  }

  return battleMod;
}

/**
 * Helper to (re)initialize Classic Battle bindings in tests.
 *
 * @param {{
 *   afterMock?: boolean,
 *   force?: boolean,
 *   timeout?: number,
 *   debug?: boolean
 * }} [opts={}] - Initialization options
 * @param {boolean} [opts.afterMock=false] - Reset bindings after mocks are applied
 * @param {boolean} [opts.force=false] - Force re-initialization even if already initialized
 * @param {number} [opts.timeout=5000] - Maximum time to wait for initialization (ms)
 * @param {boolean} [opts.debug=false] - Enable debug logging
 *
 * @returns {Promise<Object>} The battle module with bindings initialized
 *
 * @throws {TypeError} If options are invalid
 * @throws {Error} If initialization fails or times out
 *
 * @pseudocode
 * 1. Validate options
 * 2. If initialization in progress, queue this request
 * 3. Mark initialization as in progress
 * 4. Run before hooks
 * 5. Perform initialization with timeout protection
 * 6. Run after hooks
 * 7. Process any pending initializations
 * 8. Return battle module
 *
 * @example Basic usage after mocking
 * await vi.doMock('../../src/helpers/someModule.js');
 * const battle = await initClassicBattleTest({ afterMock: true });
 *
 * @example Force re-initialization
 * const battle = await initClassicBattleTest({ force: true });
 *
 * @example With custom timeout and debug
 * const battle = await initClassicBattleTest({
 *   afterMock: true,
 *   timeout: 10000,
 *   debug: true
 * });
 */
export async function initClassicBattleTest(opts = {}) {
  validateOptions(opts);

  // Prevent concurrent initialization
  if (initInProgress) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Initialization already in progress, queueing...");
    }

    return new Promise((resolve, reject) => {
      pendingInits.push({ resolve, reject, opts });
    });
  }

  initInProgress = true;

  try {
    const timeout = opts.timeout || 5000;

    // Run before hooks
    for (const hook of beforeInitHooks) {
      await hook(opts);
    }

    const initPromise = performInit(opts);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Initialization timed out after ${timeout}ms`)), timeout);
    });

    const battleMod = await Promise.race([initPromise, timeoutPromise]);

    // Run after hooks
    for (const hook of afterInitHooks) {
      await hook(battleMod, opts);
    }

    // Process pending initializations
    while (pendingInits.length > 0) {
      const pending = pendingInits.shift();
      try {
        const pendingResult = await performInit(pending.opts);
        pending.resolve(pendingResult);
      } catch (error) {
        pending.reject(error);
      }
    }

    return battleMod;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to initialize Classic Battle test:", error);
    }
    throw error;
  } finally {
    initInProgress = false;
  }
}

/**
 * Initialize with retry logic for flaky tests
 * @param {Object} opts - Options
 * @param {number} [opts.maxRetries=3] - Maximum retry attempts
 * @param {number} [opts.retryDelay=100] - Delay between retries (ms)
 * @returns {Promise<Object>} Battle module
 * @throws {Error} If all retry attempts fail
 *
 * @pseudocode
 * 1. Extract maxRetries and retryDelay from options
 * 2. For each attempt up to maxRetries:
 *    a. Try to initialize
 *    b. If success, return result
 *    c. If failure and retries remain, wait and retry
 * 3. If all attempts fail, throw error with details
 *
 * @example
 * const battle = await initClassicBattleTestWithRetry({
 *   afterMock: true,
 *   maxRetries: 5,
 *   retryDelay: 200
 * });
 */
export async function initClassicBattleTestWithRetry(opts = {}) {
  const maxRetries = opts.maxRetries || 3;
  const retryDelay = opts.retryDelay || 100;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await initClassicBattleTest(opts);
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`Init attempt ${attempt} failed, retrying...`);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  throw new Error(`Failed to initialize after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Check if Classic Battle is initialized
 * @returns {Promise<boolean>} Whether bindings are initialized
 *
 * @pseudocode
 * 1. Try to import battle module
 * 2. Check if ensure function exists
 * 3. Return true if exists, false otherwise
 *
 * @example
 * if (await isClassicBattleInitialized()) {
 *   console.log('Already initialized');
 * }
 */
export async function isClassicBattleInitialized() {
  try {
    const battleMod = await import("../../src/helpers/classicBattle.js");
    return typeof battleMod.__ensureClassicBattleBindings === "function";
  } catch {
    return false;
  }
}

/**
 * Get initialization state details
 * @returns {Promise<{initialized: boolean, hasReset: boolean, hasEnsure: boolean, error?: string}>}
 *
 * @pseudocode
 * 1. Try to import battle module
 * 2. Check which functions are available
 * 3. Return state object with details
 * 4. If import fails, return error state
 *
 * @example
 * const state = await getInitializationState();
 * console.log('Has reset:', state.hasReset);
 * console.log('Has ensure:', state.hasEnsure);
 */
export async function getInitializationState() {
  try {
    const battleMod = await import("../../src/helpers/classicBattle.js");
    return {
      initialized: true,
      hasReset: typeof battleMod.__resetClassicBattleBindings === "function",
      hasEnsure: typeof battleMod.__ensureClassicBattleBindings === "function"
    };
  } catch (error) {
    return {
      initialized: false,
      hasReset: false,
      hasEnsure: false,
      error: error.message
    };
  }
}

/**
 * Cleanup Classic Battle test environment
 * @returns {Promise<void>}
 *
 * @pseudocode
 * 1. Import battle module
 * 2. If reset function exists, call it
 * 3. If clearTestState function exists, call it
 * 4. Catch and log any errors
 *
 * @example
 * afterEach(async () => {
 *   await cleanupClassicBattleTest();
 * });
 */
export async function cleanupClassicBattleTest() {
  try {
    const battleMod = await import("../../src/helpers/classicBattle.js");

    if (typeof battleMod.__resetClassicBattleBindings === "function") {
      await battleMod.__resetClassicBattleBindings();
    }

    // Clear any test-specific state
    if (typeof battleMod.__clearTestState === "function") {
      await battleMod.__clearTestState();
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to cleanup Classic Battle test:", error);
    }
  }
}

/**
 * Register a hook to run before initialization
 * @param {Function} hook - Hook function
 * @returns {Function} Unregister function
 *
 * @pseudocode
 * 1. Add hook to beforeInitHooks array
 * 2. Return function that removes hook from array
 *
 * @example
 * const unregister = beforeInit(async (opts) => {
 *   console.log('About to initialize with', opts);
 * });
 * // Later: unregister()
 */
export function beforeInit(hook) {
  beforeInitHooks.push(hook);
  return () => {
    const index = beforeInitHooks.indexOf(hook);
    if (index > -1) beforeInitHooks.splice(index, 1);
  };
}

/**
 * Register a hook to run after initialization
 * @param {Function} hook - Hook function
 * @returns {Function} Unregister function
 *
 * @pseudocode
 * 1. Add hook to afterInitHooks array
 * 2. Return function that removes hook from array
 *
 * @example
 * const unregister = afterInit(async (battleMod, opts) => {
 *   console.log('Initialized with', opts);
 * });
 * // Later: unregister()
 */
export function afterInit(hook) {
  afterInitHooks.push(hook);
  return () => {
    const index = afterInitHooks.indexOf(hook);
    if (index > -1) afterInitHooks.splice(index, 1);
  };
}
