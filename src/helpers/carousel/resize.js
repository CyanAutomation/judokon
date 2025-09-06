import { getPageMetrics } from "./metrics.js";

/**
 * @typedef {import('./controller.js').CarouselController} CarouselController
 */

/**
 * Debounced resize handling for carousel metrics.
 *
 * @param {CarouselController} ctrl
 * @pseudocode
 * 1. Debounce resize by 100ms.
 * 2. Recompute metrics and rebuild markers if needed.
 * 3. Reset page and record listener for cleanup.
 * @returns {void}
 */
export function wireResize(ctrl) {
  const onResize = () => {
    clearTimeout(ctrl._resizeTimer);
    ctrl._resizeTimer = setTimeout(() => {
      const oldCount = ctrl.metrics.pageCount;
      ctrl.metrics = getPageMetrics(ctrl.container);
      if (ctrl.metrics.pageCount !== oldCount) {
        ctrl.markersRoot?.remove();
        ctrl.markersRoot = ctrl._buildMarkers();
        ctrl.wrapper.append(ctrl.markersRoot);
      }
      ctrl.setPage(ctrl.currentPage);
    }, 100);
  };
  window.addEventListener("resize", onResize);
  ctrl._listeners.push({ target: window, event: "resize", handler: onResize });
}
