/**
 * Attach sorting behavior to a table column header.
 *
 * @summary Enable click-to-sort on a table column with ascending/descending toggle.
 * @pseudocode
 * 1. Track sort direction state (initially 'desc' for scores).
 * 2. On header click: reverse direction, re-sort tbody rows, and update display.
 * 3. Use numeric comparison for score column, preserving data types.
 *
 * @param {HTMLElement} header - The column header element to make sortable.
 * @param {HTMLElement} tbody - The table body containing rows to sort.
 * @param {number} columnIndex - Zero-based index of the column to sort by.
 * @returns {void}
 */
export function attachColumnSort(header, tbody, columnIndex) {
  if (!header || !tbody) return;

  let sortDirection = "desc";
  header.style.cursor = "pointer";
  header.setAttribute("role", "columnheader");
  header.setAttribute("aria-sort", sortDirection === "asc" ? "ascending" : "descending");

  header.addEventListener("click", () => {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
    header.setAttribute("aria-sort", sortDirection === "asc" ? "ascending" : "descending");

    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      const aCell = a.querySelectorAll("td")[columnIndex];
      const bCell = b.querySelectorAll("td")[columnIndex];
      if (!aCell || !bCell) return 0;

      const aValue = parseFloat(aCell.textContent);
      const bValue = parseFloat(bCell.textContent);

      if (sortDirection === "asc") {
        return aValue - bValue;
      }
      return bValue - aValue;
    });

    tbody.innerHTML = "";
    rows.forEach((row) => tbody.appendChild(row));
  });
}
