let resolveHomepageReady;

/**
 * Resolve when the homepage grid is available.
 *
 * @type {Promise<void>}
 */
export const homepageReadyPromise =
  typeof window !== "undefined"
    ? new Promise((resolve) => {
        resolveHomepageReady = resolve;
      })
    : Promise.resolve();

if (typeof window !== "undefined") {
  window.homepageReadyPromise = homepageReadyPromise;
}

if (typeof document !== "undefined") {
  if (document.querySelector(".game-mode-grid")) {
    resolveHomepageReady?.();
  } else {
    const observer = new MutationObserver(() => {
      if (document.querySelector(".game-mode-grid")) {
        observer.disconnect();
        resolveHomepageReady?.();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
}
