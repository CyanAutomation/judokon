/**
 * Wait until the opponent's card loads. Resolves when a `.judoka-card` appears
 * or after a timeout.
 *
 * @param {number} [timeoutMs=5000] - Maximum wait time in milliseconds.
 * @returns {Promise<void>}
 *
 * @pseudocode
 * 1. Fetch the `#opponent-card` container.
 * 2. Resolve immediately if missing or a `.judoka-card` is already present.
 * 3. Resolve immediately if `MutationObserver` is unavailable.
 * 4. Otherwise observe mutations and resolve once a `.judoka-card` appears.
 * 5. Set a timeout that disconnects the observer and resolves after `timeoutMs`.
 */
export function waitForOpponentCard(timeoutMs = 5000) {
  const container = document.getElementById("opponent-card");
  if (!container) return Promise.resolve();
  if (container.querySelector(".judoka-card")) {
    return Promise.resolve();
  }
  if (typeof MutationObserver === "undefined") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (container.querySelector(".judoka-card")) {
        observer.disconnect();
        clearTimeout(timer);
        resolve();
      }
    });
    observer.observe(container, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeoutMs);
  });
}
