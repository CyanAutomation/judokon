/**
 * Create a reusable modal dialog with accessible behavior.
 *
 * @pseudocode
 * 1. Build a backdrop element with `modal-backdrop` class and `hidden` attribute.
 * 2. Inside it place a `div.modal` with `role="dialog"` and `aria-modal="true"`.
 * 3. Append provided content nodes into the modal.
 * 4. Expose `open()` and `close()` functions to toggle the backdrop,
 *    manage focus and `aria-expanded` on the trigger.
 * 5. Clicking the backdrop or pressing Escape closes the modal.
 * 6. While open, trap focus inside the modal container.
 *
 * @param {HTMLElement|DocumentFragment} content - Dialog contents.
 * @returns {{ element: HTMLElement, open(trigger?: HTMLElement): void, close(): void }}
 *   Modal API with DOM element and controls.
 */
export function createModal(content) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("hidden", "");

  const dialog = document.createElement("div");
  dialog.className = "modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.tabIndex = -1;

  dialog.append(content);
  backdrop.append(dialog);

  let returnFocus = null;
  let removeTrap = () => {};

  function trapFocus(el) {
    const selectors = "a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])";
    const focusables = Array.from(el.querySelectorAll(selectors));
    if (focusables.length === 0) return () => {};
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    function handle(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    el.addEventListener("keydown", handle);
    return () => el.removeEventListener("keydown", handle);
  }

  function handleEscape(e) {
    if (e.key === "Escape") close();
  }

  function open(trigger) {
    returnFocus = trigger ?? null;
    backdrop.removeAttribute("hidden");
    dialog.classList.add("open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    removeTrap = trapFocus(dialog);
    const focusTarget = dialog.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    (focusTarget || dialog).focus();
    document.addEventListener("keydown", handleEscape);
  }

  function close() {
    dialog.classList.remove("open");
    backdrop.setAttribute("hidden", "");
    removeTrap();
    document.removeEventListener("keydown", handleEscape);
    if (returnFocus) {
      returnFocus.setAttribute("aria-expanded", "false");
      returnFocus.focus();
    }
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  return { element: backdrop, open, close };
}
