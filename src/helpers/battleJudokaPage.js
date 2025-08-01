/**
 * Wait until the computer's card loads. Resolves when a `.judoka-card` appears.
 *
 * @returns {Promise<void>}
 *
 * @pseudocode
 * Export `waitForComputerCard` which resolves once a `.judoka-card` element
 * appears inside `#computer-card`.
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
