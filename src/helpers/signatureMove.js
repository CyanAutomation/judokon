/**
 * Mark signature moves as ready.
 *
 * @pseudocode
 * 1. Add `data-signature-move-ready="true"` attribute to `<body>` when available.
 * 2. Dispatch a bubbling `signature-move-ready` CustomEvent on `document`.
 *
 * @returns {void}
 */
export function markSignatureMoveReady() {
  document.body?.setAttribute("data-signature-move-ready", "true");
  document.dispatchEvent(new CustomEvent("signature-move-ready", { bubbles: true }));
}
