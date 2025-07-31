export function toggleTooltipOverlayDebug(enabled) {
  if (!document.body) return;
  document.body.classList.toggle("tooltip-overlay-debug", Boolean(enabled));
}
