/**
 * Promise and helpers to signal when signature moves finish rendering.
 *
 * @pseudocode
 * 1. Create a promise and store its resolver in `resolveReady`.
 * 2. Expose the promise on `window.signatureMoveReadyPromise`.
 * 3. Export `markSignatureMoveReady` to invoke the resolver.
 */
let resolveReady;
export const signatureMoveReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});
if (typeof window !== "undefined") {
  window.signatureMoveReadyPromise = signatureMoveReadyPromise;
}

/**
 * Resolve the ready promise when signature moves render.
 *
 * @pseudocode
 * 1. If a resolver exists, invoke it.
 */
export function markSignatureMoveReady() {
  resolveReady?.();
}
