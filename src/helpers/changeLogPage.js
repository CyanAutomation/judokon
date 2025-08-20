import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { escapeHTML, formatDate } from "./utils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { createSpinner } from "../components/Spinner.js";

/**
 * Sort judoka entries by lastUpdated descending, then by full name ascending.
 *
 * @pseudocode
 * 1. Clone the array to avoid mutating the input.
 * 2. Sort by `lastUpdated` in descending order.
 * 3. When dates are equal, sort by full name ascending.
 *
 * @param {Judoka[]} entries - Array of judoka objects.
 * @returns {Judoka[]} Sorted array of judoka objects.
 */
export function sortJudoka(entries) {
  return [...entries].sort((a, b) => {
    const dateA = new Date(a.lastUpdated).getTime();
    const dateB = new Date(b.lastUpdated).getTime();
    if (dateA !== dateB) return dateB - dateA;
    const nameA = `${a.firstname} ${a.surname}`.toLowerCase();
    const nameB = `${b.firstname} ${b.surname}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

function createRow(judoka) {
  const row = document.createElement("tr");

  const idCell = document.createElement("td");
  idCell.textContent = String(judoka.id);
  row.appendChild(idCell);

  const portraitCell = document.createElement("td");
  const img = document.createElement("img");
  img.width = 48;
  img.height = 48;
  img.src = `../assets/judokaPortraits/judokaPortrait-${judoka.id}.png`;
  img.alt = `Portrait of ${escapeHTML(`${judoka.firstname} ${judoka.surname}`)}`;
  img.onerror = () => {
    img.src = "../assets/judokaPortraits/judokaPortrait-0.png";
  };
  portraitCell.appendChild(img);
  row.appendChild(portraitCell);

  const nameCell = document.createElement("td");
  nameCell.textContent = `${judoka.firstname} ${judoka.surname}`;
  row.appendChild(nameCell);

  const codeCell = document.createElement("td");
  codeCell.textContent = judoka.cardCode || "";
  row.appendChild(codeCell);

  const dateCell = document.createElement("td");
  dateCell.textContent = formatDate(judoka.lastUpdated);
  row.appendChild(dateCell);

  return row;
}

/**
 * Initialize the changelog table with the latest judoka entries.
 *
 * @pseudocode
 * 1. Find the table, its `tbody`, and the loading indicator. Exit if table or tbody is missing.
 * 2. Fetch judoka data from `judoka.json`.
 *    - If data exists, sort and take the first 20 entries.
 *    - Create a table row for each entry and append it to the `tbody`.
 *    - Otherwise, display a "No Judoka data found" message after the table.
 * 3. If fetching fails:
 *    - Log the error and display a "No Judoka data found" message.
 * 4. Remove the loading indicator if present.
 * 5. Initialize tooltips on the page.
 *
 * @returns {Promise<void>} Resolves when setup is complete.
 */
export async function setupChangeLogPage() {
  const table = document.getElementById("changelog-table");
  const tbody = table?.querySelector("tbody");
  const loading = document.getElementById("loading-container");
  let spinner;
  if (loading) {
    loading.innerHTML = "";
    spinner = createSpinner(loading);
    spinner.show();
  }
  if (!table || !tbody) return;

  try {
    const data = await fetchJson(`${DATA_DIR}judoka.json`);
    if (Array.isArray(data) && data.length) {
      const rows = sortJudoka(data).slice(0, 20).map(createRow);
      rows.forEach((r) => tbody.appendChild(r));
    } else {
      table.insertAdjacentHTML("afterend", "<p>No Judoka data found</p>");
    }
  } catch (err) {
    console.error("Failed to load judoka:", err);
    table.insertAdjacentHTML("afterend", "<p>No Judoka data found</p>");
  } finally {
    spinner?.remove();
    loading?.remove();
  }

  initTooltips();
}

onDomReady(setupChangeLogPage);
