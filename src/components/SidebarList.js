/**
 * Create a sidebar list with selectable items.
 *
 * @pseudocode
 * 1. Build a `<ul>` element with class `sidebar-list`.
 * 2. For each item create an `<li>` with text and optional dataset or
 *    className values. Make it tabbable and update the current index
 *    on focus.
 * 3. Attach click and keyboard handlers so Enter/Space trigger
 *    `select(index)`.
 * 4. On the list element handle Arrow Up/Down to move the selection
 *    relative to the current item using `select(next, {fromListNav})`.
 * 5. Add `odd`/`even` classes for zebra striping starting with `odd`
 *    for the first item and toggle the `selected` class inside
 *    `select()`.
 * 6. Inside `select()` update the highlight, trigger a brief pulse
 *    animation on the newly selected element (unless the user prefers
 *    reduced motion), focus it, and call `onSelect` with any options.
 * 7. Return `{ element, select }` so callers can programmatically
 *    change the highlighted item.
 *
 * @param {Array<string|object>} items - Labels or config objects.
 * @param {Function} onSelect - Callback invoked with the new index.
 * @returns {{ element: HTMLUListElement, select: Function }}
 */
export function createSidebarList(items, onSelect = () => {}) {
  const list = document.createElement("ul");
  list.className = "sidebar-list";

  const elements = items.map((item, i) => {
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
    li.addEventListener("click", () => select(i));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(i);
      }
    });
    li.addEventListener("focus", () => {
      current = i;
    });
    list.appendChild(li);
    return li;
  });

  let current = -1;

  list.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = current === -1 ? (delta === 1 ? 0 : elements.length - 1) : current + delta;
      select(next, { fromListNav: true });
    }
  });

  function select(index, opts = {}) {
    current = ((index % elements.length) + elements.length) % elements.length;
    elements.forEach((el, idx) => {
      const isCurrent = idx === current;
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
    elements[current].focus();
    onSelect(current, elements[current], opts);
  }

  return { element: list, select };
}
