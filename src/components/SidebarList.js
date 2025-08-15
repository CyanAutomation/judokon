/**
 * Sidebar list with selectable items.
 *
 * @pseudocode
 * 1. Build a `<ul>` element with class `sidebar-list`.
 * 2. If no items are provided, return early with an empty list.
 * 3. For each item create an `<li>` with text and optional dataset or
 *    className values. Make it tabbable and update the current index
 *    on focus.
 * 4. Attach click and keyboard handlers so Enter/Space trigger
 *    `select(index)`.
 * 5. On the list element handle Arrow Up/Down to move the selection
 *    relative to the current item using `select(next, {fromListNav})`.
 * 6. Add `odd`/`even` classes for zebra striping starting with `odd`
 *    for the first item and toggle the `selected` class inside
 *    `select()`.
 * 7. Inside `select()` update the highlight, trigger a brief pulse
 *    animation on the newly selected element (unless the user prefers
 *    reduced motion), focus it, and call `onSelect` with any options.
 * 8. Store the list element on `this.element` and expose `select()`
 *    as a public method.
 */
export class SidebarList {
  /**
   * @param {Array<string|object>} items - Labels or config objects.
   * @param {Function} [onSelect=() => {}] - Callback invoked with the new index.
   */
  constructor(items = [], onSelect = () => {}) {
    this.onSelect = onSelect;
    this.element = document.createElement("ul");
    this.element.className = "sidebar-list";
    this.elements = [];
    this.current = -1;

    if (!items.length) return;

    this.elements = items.map((item, i) => {
      const li = document.createElement("li");
      li.tabIndex = 0;
      if (typeof item === "string") {
        li.textContent = item;
      } else if (item && typeof item === "object") {
        li.textContent = item.label || "";
        if (item.className) li.classList.add(item.className);
        if (item.dataset) {
          Object.entries(item.dataset).forEach(([k, v]) => {
            li.dataset[k] = v;
          });
        }
      }
      li.classList.add(i % 2 === 0 ? "odd" : "even");
      li.addEventListener("click", () => this.select(i));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.select(i);
        }
      });
      li.addEventListener("focus", () => {
        this.current = i;
      });
      this.element.appendChild(li);
      return li;
    });

    this.element.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const next =
          this.current === -1 ? (delta === 1 ? 0 : this.elements.length - 1) : this.current + delta;
        this.select(next, { fromListNav: true });
      }
    });
  }

  /**
   * Select an item by index.
   *
   * @param {number} index - Item index to highlight.
   * @param {object} [opts={}] - Options passed to `onSelect`.
   * @returns {void}
   */
  select(index, opts = {}) {
    if (!this.elements.length) return;

    this.current = ((index % this.elements.length) + this.elements.length) % this.elements.length;
    this.elements.forEach((el, idx) => {
      const isCurrent = idx === this.current;
      el.classList.toggle("selected", isCurrent);
      if (isCurrent) {
        el.setAttribute("aria-current", "page");
        const prefersReduced = window.matchMedia
          ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
          : false;
        if (!prefersReduced) {
          el.style.animation = "none";
          void el.offsetWidth;
          el.style.animation = "";
        }
      } else {
        el.removeAttribute("aria-current");
      }
    });
    this.elements[this.current].focus();
    this.onSelect(this.current, this.elements[this.current], opts);
  }
}
