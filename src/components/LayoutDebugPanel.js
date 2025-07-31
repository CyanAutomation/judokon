/**
 * Create a collapsible layout debug panel that outlines key elements.
 *
 * @pseudocode
 * 1. Build a `.debug-panel` container with a toggle button and `<pre>` output.
 * 2. The button toggles `aria-expanded` and shows or hides the output.
 * 3. When expanded, add `.layout-debug-outline` to all matching elements and
 *    populate the output with their bounding boxes.
 * 4. When collapsed, remove the outline classes and hide the output.
 *
 * @param {string[]} selectors - CSS selectors for elements to inspect.
 * @returns {HTMLDivElement} The debug panel element.
 */
export function createLayoutDebugPanel(selectors = []) {
  const panel = document.createElement("div");
  panel.id = "layout-debug-panel";
  panel.className = "debug-panel";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "layout-debug-toggle";
  toggle.textContent = "Show Layout Boxes";
  toggle.setAttribute("aria-expanded", "false");
  panel.appendChild(toggle);

  const pre = document.createElement("pre");
  pre.id = "layout-debug-output";
  pre.setAttribute("role", "status");
  pre.setAttribute("aria-live", "polite");
  pre.hidden = true;
  panel.appendChild(pre);

  function applyOutline(enable) {
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.toggle("layout-debug-outline", enable);
      });
    });
  }

  function updateOutput() {
    const lines = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const rect = el.getBoundingClientRect();
        const name = el.id
          ? `#${el.id}`
          : el.classList.length > 0
            ? `.${el.classList[0]}`
            : el.tagName.toLowerCase();
        lines.push(
          `${name}: ${Math.round(rect.left)},${Math.round(rect.top)} ` +
            `${Math.round(rect.width)}x${Math.round(rect.height)}`
        );
      });
    });
    pre.textContent = lines.join("\n");
  }

  function handleToggle() {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.textContent = expanded ? "Show Layout Boxes" : "Hide Layout Boxes";
    pre.hidden = expanded;
    applyOutline(!expanded);
    if (!expanded) updateOutput();
  }

  toggle.addEventListener("click", handleToggle);
  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  });

  return panel;
}
