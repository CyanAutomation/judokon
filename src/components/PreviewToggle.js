/**
 * Expandable preview container with a toggle button.
 *
 * @pseudocode
 * 1. Wrap the given element in a `.preview-container` div and insert a toggle button after it.
 * 2. Clicking the button toggles an `expanded` class and updates `aria-expanded` and label text.
 * 3. Hide the button when the content height is 300px or less.
 * 4. Expose `update()` to recompute button visibility and `reset()` to collapse the view.
 */
export class PreviewToggle {
  /**
   * @param {HTMLElement} previewEl - Element containing preview content.
   */
  constructor(previewEl) {
    this.previewEl = previewEl || document.createElement("div");
    this.container = document.createElement("div");
    this.container.className = "preview-container";
    // Gracefully handle cases where the preview element is missing or detached
    if (previewEl && previewEl.parentNode) {
      previewEl.parentNode.insertBefore(this.container, previewEl);
      this.container.appendChild(previewEl);
    }

    this.button = document.createElement("button");
    this.button.id = "toggle-preview-btn";
    this.button.className = "secondary-button preview-toggle";
    this.button.type = "button";
    this.button.textContent = "Expand";
    this.button.setAttribute("aria-expanded", "false");
    // Only attach the button when we successfully wrapped an existing preview element
    if (this.container.parentNode) {
      this.container.after(this.button);
    }

    this.expanded = false;
    this.button.addEventListener("click", () => this.toggle());
    this.update();
  }

  toggle() {
    this.expanded = !this.expanded;
    this.container.classList.toggle("expanded", this.expanded);
    this.button.textContent = this.expanded ? "Collapse" : "Expand";
    this.button.setAttribute("aria-expanded", String(this.expanded));
  }

  update() {
    const needsToggle = this.previewEl && this.previewEl.scrollHeight > 300;
    this.button.hidden = !needsToggle;
    if (!needsToggle) this.reset();
  }

  reset() {
    this.expanded = false;
    this.container.classList.remove("expanded");
    this.button.setAttribute("aria-expanded", "false");
    this.button.textContent = "Expand";
  }
}
