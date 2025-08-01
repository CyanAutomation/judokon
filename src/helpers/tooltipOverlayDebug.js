/**
 * Toggle the tooltip debug overlay class on the document body.
 *
 * @param {boolean} enabled - Whether the overlay should be enabled.
 * @returns {void}
 */
export function toggleTooltipOverlayDebug(enabled) {
  if (!document.body) return;
  document.body.classList.toggle("tooltip-overlay-debug", Boolean(enabled));
}
