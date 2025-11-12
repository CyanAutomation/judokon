let resolveHomepageReady;

/**
 * Resolve when the homepage grid is available and signal readiness.
 *
 * @type {Promise<void>}
 * @pseudocode
 * 1. If document has a `.game-mode-grid` element, resolve immediately.
 * 2. Otherwise create a `MutationObserver` watching for child additions.
 * 3. Resolve and disconnect the observer once `.game-mode-grid` appears.
 */
export const homepageReadyPromise =
  typeof document !== "undefined"
    ? new Promise((resolve) => {
        resolveHomepageReady = () => {
          document.body?.setAttribute("data-home-ready", "true");
          document.dispatchEvent(new CustomEvent("home-ready", { bubbles: true }));
          resolve();
        };
      })
    : Promise.resolve();

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
