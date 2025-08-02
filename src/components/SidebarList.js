/**
 * Create a sidebar list with selectable items.
 *
 * @pseudocode
 * 1. Build a `<ul>` element with class `sidebar-list`.
 * 2. For each provided item create an `<li>` with text and optional
 *    dataset or className values.
 * 3. Attach click and keyboard handlers so Enter/Space trigger
 *    selection using `select(index)` and Arrow Up/Down move the
 *    selection relative to the current item.
 * 4. Add `odd`/`even` classes for zebra striping starting with `odd`
 *    for the first item and toggle the `selected` class inside
 *    `select()`.
 * 5. Inside `select()` update the highlight, focus the newly
 *    selected element, and call `onSelect`.
 * 6. Return `{ element, select }` so callers can programmatically
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
    list.appendChild(li);
    return li;
  });

  let current = -1;

  list.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = current === -1 ? (delta === 1 ? 0 : elements.length - 1) : current + delta;
      select(next);
    }
  });

  function select(index) {
    current = ((index % elements.length) + elements.length) % elements.length;
    elements.forEach((el, idx) => {
      el.classList.toggle("selected", idx === current);
    });
    elements[current].focus();
    onSelect(current, elements[current]);
  }

  return { element: list, select };
}
