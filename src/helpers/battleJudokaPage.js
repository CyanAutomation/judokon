/**
 * Wait until the computer's card loads. Resolves when a `.judoka-card` appears.
 *
 * @returns {Promise<void>}
 *
 * @pseudocode
 * 1. Fetch the `#computer-card` container.
 * 2. Resolve immediately if missing or a `.judoka-card` is already present.
 * 3. Otherwise observe mutations and resolve once a `.judoka-card` appears.
 */
export function waitForComputerCard() {
  const container = document.getElementById("computer-card");
  if (!container) return Promise.resolve();
  if (container.querySelector(".judoka-card")) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (container.querySelector(".judoka-card")) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  });
}
