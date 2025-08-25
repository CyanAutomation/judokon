/**
 * Signal when the homepage grid is available.
 *
 * @pseudocode
 * 1. If `.game-mode-grid` exists, mark the document as ready.
 * 2. Otherwise, observe DOM mutations until it appears, then mark ready.
 *
 * Marking ready entails:
 *  - Setting `data-homepage-ready="true"` on `<body>`.
 *  - Dispatching a `homepage-ready` event on `document`.
 */
function markHomepageReady() {
  document.body.setAttribute("data-homepage-ready", "true");
  document.dispatchEvent(new CustomEvent("homepage-ready"));
}

if (typeof document !== "undefined") {
  if (document.querySelector(".game-mode-grid")) {
    markHomepageReady();
  } else {
    const observer = new MutationObserver(() => {
      if (document.querySelector(".game-mode-grid")) {
        observer.disconnect();
        markHomepageReady();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
}
