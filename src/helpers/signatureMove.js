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
export function markSignatureMoveReady() {
  document.body?.setAttribute("data-signature-move-ready", "true");
  document.dispatchEvent(new CustomEvent("signature-move-ready", { bubbles: true }));
  resolveReady?.();
}
