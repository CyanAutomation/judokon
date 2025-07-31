/**
 * Create a sidebar list with selectable items.
 *
 * @pseudocode
 * 1. Build a `<ul>` element with class `sidebar-list`.
 * 2. For each provided item create an `<li>` with text and optional
 *    dataset or className values.
 * 3. Attach click and keyboard handlers so Enter or Space trigger
 *    selection using `select(index)`.
 * 4. Add `even`/`odd` classes for zebra striping and toggle the
 *    `selected` class inside `select()`.
 * 5. Call the `onSelect` callback whenever a new index is selected.
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
    li.classList.add(i % 2 === 0 ? "even" : "odd");
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

  function select(index) {
    current = ((index % elements.length) + elements.length) % elements.length;
    elements.forEach((el, idx) => {
      el.classList.toggle("selected", idx === current);
    });
    onSelect(current, elements[current]);
  }

  return { element: list, select };
}
