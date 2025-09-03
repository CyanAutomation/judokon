/**
 * Promise and helpers to signal when signature moves finish rendering.
 *
 * @pseudocode
 * 1. Create a promise and store its resolver in `resolveReady`.
 * 2. Export `markSignatureMoveReady` to resolve the promise, set
 *    `data-signature-move-ready` on `<body>`, and dispatch
 *    `signature-move-ready`.
 */
let resolveReady;

/**
 * Promise that resolves when the signature move animations/rendering are ready.
 *
 * @pseudocode
 * 1. Create a new Promise and capture its resolve function in `resolveReady`.
 * 2. Consumers can `await signatureMoveReadyPromise` to run code after readiness.
 *
 * @type {Promise<void>}
 */
export const signatureMoveReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

/**
 * Mark signature moves as ready.
 *
 * @pseudocode
 * 1. Add `data-signature-move-ready="true"` attribute to `<body>` when available.
 * 2. Dispatch a bubbling `signature-move-ready` CustomEvent on `document`.
 * 3. If a resolver was captured, invoke it to resolve the readiness promise.
 *
 * @returns {void}
 */
export function markSignatureMoveReady() {
  document.body?.setAttribute("data-signature-move-ready", "true");
  document.dispatchEvent(new CustomEvent("signature-move-ready", { bubbles: true }));
  resolveReady?.();
}
