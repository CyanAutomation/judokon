/**
 * Signal when signature moves finish rendering.
 *
 * @pseudocode
 * 1. Set `data-signature-move-ready="true"` on `<body>`.
 * 2. Dispatch a `signature-move-ready` event on `document`.
 */
export function markSignatureMoveReady() {
  document.body.setAttribute("data-signature-move-ready", "true");
  document.dispatchEvent(new CustomEvent("signature-move-ready"));
}
