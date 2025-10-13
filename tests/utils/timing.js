/**
 * Await the next animation frame when available, falling back to a macrotask.
 *
 * @pseudocode
 * IF window.requestAnimationFrame exists
 *   schedule resolve on next animation frame
 * ELSE
 *   schedule resolve via setTimeout(0)
 * @returns {Promise<void>} Resolves on the next frame or after a 0ms timeout.
 */
export const waitForNextFrame = () =>
  new Promise((resolve) => {
    const target = typeof window !== "undefined" ? window : globalThis;
    const raf = target?.requestAnimationFrame;

    if (typeof raf === "function") {
      raf(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
