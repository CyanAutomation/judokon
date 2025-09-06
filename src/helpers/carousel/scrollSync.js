import { getPageMetrics } from "./metrics.js";

/**
 * @typedef {import('./controller.js').CarouselController} CarouselController
 */

/**
 * Keeps controller state in sync with scroll events.
 *
 * @param {CarouselController} ctrl
 * @pseudocode
 * 1. On scroll, bail if suppressed.
 * 2. Ensure metrics are valid and compute page from scrollLeft.
 * 3. Update controller and schedule rAF resync.
 * 4. Record listener for cleanup.
 * @returns {void}
 */
export function wireScrollSync(ctrl) {
  const onScroll = () => {
    if (ctrl._suppressScrollSync) return;
    if (ctrl.metrics.pageWidth <= 0) {
      ctrl.metrics = getPageMetrics(ctrl.container);
    }
    const { pageWidth, pageCount } = ctrl.metrics;
    if (pageWidth > 0) {
      const page = Math.round(ctrl.container.scrollLeft / pageWidth);
      ctrl.currentPage = Math.max(0, Math.min(page, pageCount - 1));
      ctrl.update();
    }
    if (ctrl._rafId) cancelAnimationFrame(ctrl._rafId);
    ctrl._rafId = requestAnimationFrame(() => {
      if (ctrl._suppressScrollSync) return;
      if (ctrl.metrics.pageWidth <= 0) {
        ctrl.metrics = getPageMetrics(ctrl.container);
      }
      const { pageWidth: pw, pageCount: pc } = ctrl.metrics;
      if (pw <= 0) return;
      const page = Math.round(ctrl.container.scrollLeft / pw);
      ctrl.currentPage = Math.max(0, Math.min(page, pc - 1));
      ctrl.update();
    });
  };
  ctrl.container.addEventListener("scroll", onScroll);
  ctrl._listeners.push({ target: ctrl.container, event: "scroll", handler: onScroll });
}
