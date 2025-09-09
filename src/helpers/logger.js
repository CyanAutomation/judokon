/* Lightweight logger that stays silent during Vitest runs unless explicitly enabled.
 * Purpose: many modules use console.log at import or runtime for debug traces.
 * Tests already mute console in setup, but some logs can still escape. This
 * helper centralizes the gate so library code can opt-in to quieter output.
 */
const isVitest = typeof process !== "undefined" && !!process.env && !!process.env.VITEST;
const showTestLogs =
  typeof process !== "undefined" && !!process.env && !!process.env.SHOW_TEST_LOGS;

function shouldLog() {
  // In Vitest worker processes default to silence unless SHOW_TEST_LOGS is truthy.
  if (isVitest && !showTestLogs) return false;
  return true;
}

export const log = (...args) => {
  if (!shouldLog()) return;
  // keep original console behaviour
  console.log(...args);
};

export const debug = (...args) => {
  if (!shouldLog()) return;
  console.debug(...args);
};

export const info = (...args) => {
  if (!shouldLog()) return;
  console.info(...args);
};

export const warn = (...args) => {
  // always surface warnings even during test runs; tests may assert on them
  console.warn(...args);
};

export const error = (...args) => {
  // always surface errors even during test runs
  console.error(...args);
};

export default { log, debug, info, warn, error };
