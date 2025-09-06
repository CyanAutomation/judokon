/**
 * @typedef {import('./controller.js').CarouselController} CarouselController
 */

/**
 * Enables touch and pointer swipe navigation for a carousel.
 *
 * @param {CarouselController} ctrl
 * @pseudocode
 * 1. Track gesture start and kind.
 * 2. On end, compare delta with threshold -> prev/next.
 * 3. Register touch and pointer listeners and record them for cleanup.
 * @returns {void}
 */
export function wireSwipe(ctrl) {
  let startX = 0;
  let gestureActive = false;
  let activeKind = null;
  let pointerDown = false;

  const reset = () => {
    gestureActive = false;
    if (activeKind === "pointer") pointerDown = false;
    activeKind = null;
  };

  const onEnd = (endX) => {
    if (!gestureActive) return;
    const delta = endX - startX;
    reset();
    if (delta > ctrl.threshold) {
      ctrl.prev();
    } else if (delta < -ctrl.threshold) {
      ctrl.next();
    }
  };

  const onTouchStart = (e) => {
    if (gestureActive) return;
    gestureActive = true;
    activeKind = "touch";
    startX = e.touches[0].clientX;
    if (typeof e.preventDefault === "function") e.preventDefault();
  };

  const onTouchEnd = (e) => {
    onEnd(e.changedTouches[0].clientX);
    if (typeof e.preventDefault === "function") e.preventDefault();
  };

  const onTouchMove = (e) => {
    if (typeof e.preventDefault === "function") e.preventDefault();
  };

  const onTouchCancel = () => {
    reset();
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "touch" || gestureActive) return;
    gestureActive = true;
    activeKind = "pointer";
    pointerDown = true;
    startX = e.clientX;
  };

  const onPointerUp = (e) => {
    if (!pointerDown) return;
    onEnd(e.clientX);
  };

  const onPointerCancel = () => {
    reset();
  };

  const c = ctrl.container;
  c.addEventListener("touchstart", onTouchStart, { passive: false });
  c.addEventListener("touchend", onTouchEnd, { passive: false });
  c.addEventListener("touchmove", onTouchMove, { passive: false });
  c.addEventListener("touchcancel", onTouchCancel);
  c.addEventListener("pointerdown", onPointerDown);
  c.addEventListener("pointerup", onPointerUp);
  c.addEventListener("pointercancel", onPointerCancel);

  ctrl._listeners.push(
    { target: c, event: "touchstart", handler: onTouchStart },
    { target: c, event: "touchend", handler: onTouchEnd },
    { target: c, event: "touchmove", handler: onTouchMove },
    { target: c, event: "touchcancel", handler: onTouchCancel },
    { target: c, event: "pointerdown", handler: onPointerDown },
    { target: c, event: "pointerup", handler: onPointerUp },
    { target: c, event: "pointercancel", handler: onPointerCancel }
  );
}
