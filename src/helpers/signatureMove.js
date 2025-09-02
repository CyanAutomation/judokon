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
 * Resolve the ready promise when signature moves render.
 *
 * @pseudocode
 * 1. Set `data-signature-move-ready="true"` on `<body>`.
 * 2. Dispatch a `signature-move-ready` event on `document`.
 * 3. If a resolver exists, invoke it.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Mark signature moves as ready.
 *
 * @pseudocode
 * 1. Set `data-signature-move-ready="true"` on the `<body>` element when available.
 * 2. Dispatch a bubbling `signature-move-ready` CustomEvent on `document`.
 * 3. If a resolver was captured, call it to resolve `signatureMoveReadyPromise`.
 *
 * @returns {void}
 */
export function markSignatureMoveReady() {
  document.body?.setAttribute("data-signature-move-ready", "true");
  document.dispatchEvent(new CustomEvent("signature-move-ready", { bubbles: true }));
  resolveReady?.();
}
