/**
 * @typedef {import('./controller.js').CarouselController} CarouselController
 */

/**
 * Adds ArrowLeft/ArrowRight keyboard navigation to a carousel.
 *
 * @param {CarouselController} ctrl
 * @pseudocode
 * 1. Make container focusable with instant scroll.
 * 2. On keydown ArrowLeft, call `ctrl.prev()`.
 * 3. On keydown ArrowRight, call `ctrl.next()`.
 * 4. Track listener for later removal.
 * @returns {void}
 */
export function wireKeyboard(ctrl) {
  ctrl.container.style.scrollBehavior = "auto";
  ctrl.container.tabIndex = 0;
  const onKeydown = (event) => {
    if (event.target !== ctrl.container) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      ctrl.prev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      ctrl.next();
    }
  };
  ctrl.container.addEventListener("keydown", onKeydown);
  ctrl._listeners.push({ target: ctrl.container, event: "keydown", handler: onKeydown });
}
