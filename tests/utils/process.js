/**
 * Execute a callback with `process.stdout` temporarily disabled.
 *
 * @template T
 * @param {() => T | Promise<T>} callback - Work to run while stdout is unavailable.
 * @returns {Promise<T>} The callback result.
 */
export async function withProcessStdoutDisabled(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("withProcessStdoutDisabled expects a function");
  }

  if (typeof process === "undefined") {
    return await callback();
  }

  const originalDescriptor = Object.getOwnPropertyDescriptor(process, "stdout");

  Object.defineProperty(process, "stdout", {
    value: undefined,
    configurable: true,
    writable: true
  });

  try {
    return await callback();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(process, "stdout", originalDescriptor);
    } else {
      delete process.stdout;
    }
  }
}
