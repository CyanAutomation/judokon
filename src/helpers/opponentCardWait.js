/**
 * Wait until the opponent's card loads. Resolves when a `.judoka-card` appears
 * in the `#opponent-card` container or after a timeout.
 *
 * @param {number} [timeoutMs=5000] - Maximum wait time in milliseconds.
 * @param {typeof MutationObserver} [observe=globalThis.MutationObserver]
 *   - Observer constructor used to watch DOM mutations.
 * @returns {Promise<void>}
 *
 * @pseudocode
 * 1. Fetch the `#opponent-card` container.
 * 2. Resolve immediately if missing or a `.judoka-card` is already present.
 * 3. Resolve immediately if the provided `observe` function is unavailable.
 * 4. Otherwise instantiate `observe` and resolve once a `.judoka-card` appears.
 * 5. Set a timeout that disconnects the observer and resolves after `timeoutMs`.
 */
export function waitForOpponentCard(timeoutMs = 5000, observe = globalThis.MutationObserver) {
  const container = document.getElementById("opponent-card");
  if (!container) return Promise.resolve();
  if (container.querySelector(".judoka-card")) {
    return Promise.resolve();
  }
  if (typeof observe === "undefined") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const observer = new observe(() => {
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

