/**
 * Attach handlers to toggle visibility of settings sections.
 *
 * @pseudocode
 * 1. Query all buttons with the `.settings-section-toggle` class.
 * 2. For each button, locate the associated content element via `aria-controls`.
 * 3. On `click` or `keydown` (Enter/Space), toggle the hidden state of the content.
 *    - Update the button's `aria-expanded` attribute accordingly.
 */
export function setupSectionToggles() {
  const buttons = document.querySelectorAll(".settings-section-toggle");
  buttons.forEach((btn) => {
    // Avoid attaching duplicate listeners if called multiple times
    if (btn.dataset.toggleInitialized === "true") return;
    const contentId = btn.getAttribute("aria-controls");
    const content = document.getElementById(contentId);
    if (!content) return;

    const toggle = () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      if (expanded) {
        content.setAttribute("hidden", "");
      } else {
        content.removeAttribute("hidden");
      }
    };

    btn.addEventListener("click", toggle);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    btn.dataset.toggleInitialized = "true";
  });
}
