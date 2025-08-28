/**
 * Temporarily set environment variables for a test and restore afterwards.
 *
 * @example
 * await withEnv({ FOO: 'bar' }, async () => {
 *   expect(process.env.FOO).toBe('bar');
 * });
 *
 * @param {Record<string, string | undefined>} vars
 * @param {() => any | Promise<any>} fn
 */
export async function withEnv(vars, fn) {
  const original = process.env;
  // Use a shallow clone to avoid mutating the original object directly
  process.env = { ...original, ...vars };
  try {
    return await fn();
  } finally {
    process.env = original;
  }
}
