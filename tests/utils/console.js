// [TEST DEBUG] top-level console.js

console.log("[TEST DEBUG] top-level console.js");
// Capture originals once so we can restore accurately even if tests overwrite console methods
const ORIGINAL = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

function noop() {}

/**
 * Temporarily mute console methods for the duration of fn, then restore.
 * @param {Function} fn - async or sync function to execute while muted
 * @param {Array<keyof Console>} levels - console methods to mute
 * @returns {Promise<unknown>} - result of fn
 * @pseudocode
 * store previous = current console methods for levels
 * set console[level] = noop for each level
 * result = await fn()
 * restore console methods from previous
 * return result
 */
export async function withMutedConsole(fn, levels = ["error", "warn"]) {
  const previous = new Map(levels.map((l) => [l, console[l]]));
  try {
    levels.forEach((lvl) => {
      // Avoid spy state leaking: direct assignment rather than vi.spyOn here
      console[lvl] = noop;
    });
    return await fn();
  } finally {
    levels.forEach((lvl) => {
      console[lvl] = previous.get(lvl);
    });
  }
}

/**
 * Temporarily allow console output (restore to originals) while executing fn.
 * Useful when global muting is active in test setup.
 * @param {Function} fn - async or sync function to execute while allowed
 * @param {Array<keyof Console>} levels - console methods to allow
 * @returns {Promise<unknown>} - result of fn
 * @pseudocode
 * store previous = current console methods for levels
 * set console[level] = ORIGINAL[level] for each level
 * result = await fn()
 * restore console methods from previous
 * return result
 */
export async function withAllowedConsole(fn, levels = ["error", "warn"]) {
  const previous = new Map(levels.map((l) => [l, console[l]]));
  try {
    levels.forEach((lvl) => {
      console[lvl] = ORIGINAL[lvl];
    });
    return await fn();
  } finally {
    levels.forEach((lvl) => {
      console[lvl] = previous.get(lvl);
    });
  }
}

/**
 * Mute console globally (used from tests/setup.js beforeEach).
 * Not implemented with vi.spyOn so vi.restoreAllMocks won't interfere.
 * @param {Array<keyof Console>} levels
 */
export function muteConsole(levels = ["error", "warn"]) {
  levels.forEach((lvl) => {
    console[lvl] = noop;
  });
}

/**
 * Restore console methods to their true originals.
 * @param {Array<keyof Console>} levels
 */
export function restoreConsole(levels = ["error", "warn"]) {
  levels.forEach((lvl) => {
    console[lvl] = ORIGINAL[lvl];
  });
}
