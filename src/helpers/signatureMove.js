/**
 * A promise that resolves when the signature move UI elements are fully
 * rendered and ready for interaction.
 *
 * @summary This promise provides a reliable signal for external scripts or tests
 * to know when the signature move section of the UI is prepared.
 *
 * @description
 * Consumers can await this promise to defer behavior until the signature
 * move UI has finished initial rendering/animations. The resolver is stored
 * internally and triggered by `markSignatureMoveReady()`.
 *
 * @pseudocode
 * 1. A new `Promise` is created and assigned to `signatureMoveReadyPromise`.
 * 2. The `resolve` function of this promise is captured in the module-scoped `resolveReady` variable.
 * 3. This promise will remain pending until `markSignatureMoveReady()` is called, which then invokes `resolveReady()`.
 * 4. External code can `await` this promise to ensure that the signature move UI is fully loaded and interactive before proceeding.
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
