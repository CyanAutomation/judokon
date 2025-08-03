/**
 * Toggle the tooltip debug overlay class on the document body.
 *
 * @pseudocode
 * 1. If document.body is not available, return immediately.
 * 2. Toggle the "tooltip-overlay-debug" class on document.body based on `enabled`.
 *
 * @param {boolean} enabled - Whether the overlay should be enabled.
 * @returns {void}
 */
export function toggleTooltipOverlayDebug(enabled) {
  if (!document.body) return;
  document.body.classList.toggle("tooltip-overlay-debug", Boolean(enabled));
}
