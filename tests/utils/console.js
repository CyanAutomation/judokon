// Capture originals once so we can restore accurately even if tests overwrite console methods
const ORIGINAL = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

const VALID_LEVELS = ["log", "info", "warn", "error", "debug"];

function noop() {}

/**
 * Validate console levels array
 * @param {Array<string>} levels - console method names to validate
 * @throws {TypeError} if any level is invalid
 */
function validateLevels(levels) {
  const invalid = levels.filter((l) => !VALID_LEVELS.includes(l));
  if (invalid.length > 0) {
    throw new TypeError(`Invalid console levels: ${invalid.join(", ")}`);
  }
}

/**
 * Temporarily mute console methods for the duration of fn, then restore.
 * @template T
 * @param {() => T | Promise<T>} fn - async or sync function to execute while muted
 * @param {('log'|'info'|'warn'|'error'|'debug')[]} levels - console methods to mute
 * @returns {Promise<T>} - result of fn
 * @pseudocode
 * validate levels are valid console methods
 * store previous = current console methods for levels
 * set console[level] = noop for each level
 * result = await fn() (handles both sync and async)
 * restore console methods from previous
 * return result
 * @example
 * await withMutedConsole(async () => {
 *   console.error('This will not show');
 * });
 * @example Custom levels
 * await withMutedConsole(() => {
 *   console.log('Muted');
 * }, ['log', 'info']);
 */
export async function withMutedConsole(fn, levels = ["error", "warn"]) {
  validateLevels(levels);
  const previous =
    levels.length <= 3
      ? levels.map((l) => [l, console[l]])
      : new Map(levels.map((l) => [l, console[l]]));
  try {
    levels.forEach((lvl) => {
      // Avoid spy state leaking: direct assignment rather than vi.spyOn here
      console[lvl] = noop;
    });
    const result = fn();
    return result instanceof Promise ? await result : result;
  } finally {
    levels.forEach((lvl) => {
      const prevValue =
        previous instanceof Map ? previous.get(lvl) : previous.find(([l]) => l === lvl)?.[1];
      console[lvl] = prevValue;
    });
  }
}

/**
 * Temporarily allow console output (restore to originals) while executing fn.
 * Useful when global muting is active in test setup.
 * @template T
 * @param {() => T | Promise<T>} fn - async or sync function to execute while allowed
 * @param {('log'|'info'|'warn'|'error'|'debug')[]} levels - console methods to allow
 * @returns {Promise<T>} - result of fn
 * @pseudocode
 * validate levels are valid console methods
 * store previous = current console methods for levels
 * set console[level] = ORIGINAL[level] for each level
 * result = await fn() (handles both sync and async)
 * restore console methods from previous
 * return result
 * @example
 * await withAllowedConsole(async () => {
 *   console.error('This WILL show');
 * });
 */
export async function withAllowedConsole(fn, levels = ["error", "warn"]) {
  validateLevels(levels);
  const previous =
    levels.length <= 3
      ? levels.map((l) => [l, console[l]])
      : new Map(levels.map((l) => [l, console[l]]));
  try {
    levels.forEach((lvl) => {
      console[lvl] = ORIGINAL[lvl];
    });
    const result = fn();
    return result instanceof Promise ? await result : result;
  } finally {
    levels.forEach((lvl) => {
      const prevValue =
        previous instanceof Map ? previous.get(lvl) : previous.find(([l]) => l === lvl)?.[1];
      console[lvl] = prevValue;
    });
  }
}

/**
 * Mute console globally (used from tests/setup.js beforeEach).
 * Not implemented with vi.spyOn so vi.restoreAllMocks won't interfere.
 * @param {('log'|'info'|'warn'|'error'|'debug')[]} levels - console methods to mute
 */
export function muteConsole(levels = ["error", "warn"]) {
  validateLevels(levels);
  levels.forEach((lvl) => {
    console[lvl] = noop;
  });
}

/**
 * Restore console methods to their true originals.
 * @param {('log'|'info'|'warn'|'error'|'debug')[]} levels - console methods to restore
 */
export function restoreConsole(levels = ["error", "warn"]) {
  validateLevels(levels);
  levels.forEach((lvl) => {
    console[lvl] = ORIGINAL[lvl];
  });
}

/**
 * Create a spy that counts calls while muted
 * @param {('log'|'info'|'warn'|'error'|'debug')} level - console method to spy on
 * @returns {{ restore: Function, getCalls: () => number }} spy controls
 * @example
 * const spy = createMutedSpy('error');
 * console.error('test'); // muted but counted
 * console.log(spy.getCalls()); // 1
 * spy.restore();
 */
export function createMutedSpy(level = "error") {
  validateLevels([level]);
  let callCount = 0;
  const prev = console[level];
  console[level] = () => {
    callCount++;
  };
  return {
    restore: () => {
      console[level] = prev;
    },
    getCalls: () => callCount
  };
}
