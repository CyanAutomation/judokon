/**
 * Determine whether test debug logs should be emitted.
 *
 * @returns {boolean}
 * @summary Check if the SHOW_TEST_LOGS environment variable is enabled.
 * @pseudocode
 * if process is undefined -> return false
 * else return Boolean(process.env.SHOW_TEST_LOGS)
 */
export function shouldShowTestLogs() {
  return typeof process !== "undefined" && process.env?.SHOW_TEST_LOGS;
}
}

/**
 * Determine whether a console method is mocked by Vitest.
 *
 * @param {unknown} method - Console method reference to inspect.
 * @returns {boolean}
 * @summary Verify if Vitest currently mocks the provided method.
 * @pseudocode
 * get globalThis.vi
 * if vi.isMockFunction exists and method is a function -> return vi.isMockFunction(method)
 * otherwise -> return false
 */
export function isConsoleMocked(method) {
  const viInstance = globalThis?.vi;
  return (
    typeof viInstance?.isMockFunction === "function" &&
    typeof method === "function" &&
    viInstance.isMockFunction(method)
  );
}
