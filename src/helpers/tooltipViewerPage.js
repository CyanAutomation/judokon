import { fetchJson } from "./dataUtils.js";
import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";
import { createSidebarList } from "../components/SidebarList.js";

/**
 * Initialize the Tooltip Viewer page.
 *
 * @pseudocode
 * 1. Load and flatten `tooltips.json` using `fetchJson` and `flattenTooltips`.
 * 2. Render a clickable list of keys filtered by the search box (300ms debounce).
 * 3. When a key is selected, display its parsed HTML and raw text in the preview.
 * 4. Provide copy buttons for the key and body using `navigator.clipboard`.
 * 5. On page load, select the key from the URL hash when present and scroll to it.
 * 6. Call `initTooltips()` so help icons inside the page gain tooltips.
 */
export async function setupTooltipViewerPage() {
  const searchInput = document.getElementById("tooltip-search");
  let listPlaceholder = document.getElementById("tooltip-list");
  const previewEl = document.getElementById("tooltip-preview");
  const rawEl = document.getElementById("tooltip-raw");
  const keyCopyBtn = document.getElementById("copy-key-btn");
  const bodyCopyBtn = document.getElementById("copy-body-btn");

  let data;
  try {
    const json = await fetchJson(`${DATA_DIR}tooltips.json`);
    data = flattenTooltips(json);
  } catch (err) {
    console.error("Failed to load tooltips", err);
    previewEl.textContent = "Error loading tooltips.";
    return;
  }

  let listSelect;

  function renderList(filter = "") {
    const items = [];
    const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
    Object.entries(data).forEach(([key, body]) => {
      const haystack = `${key} ${body}`.toLowerCase();
      const match = terms.every((t) => haystack.includes(t));
      if (match) {
        const valid = typeof body === "string" && body.trim().length > 0;
        items.push({
          label: key,
          className: valid ? undefined : "invalid",
          dataset: { key, body, valid: String(valid) }
        });
      }
    });
    const result = createSidebarList(items, (_, el) => {
      select(el.dataset.key);
    });
    listSelect = result.select;
    result.element.id = "tooltip-list";
    listPlaceholder.replaceWith(result.element);
    listPlaceholder = result.element;
  }

  let selectedKey;
  function select(key) {
    if (selectedKey === key) return;
    selectedKey = key;
    const body = data[key] ?? "";
    if (listSelect) {
      const index = Array.from(listPlaceholder.children).findIndex((el) => el.dataset.key === key);
      if (index !== -1) listSelect(index);
    }
    previewEl.innerHTML = parseTooltipText(body);
    rawEl.textContent = body;
    keyCopyBtn.dataset.copy = key;
    bodyCopyBtn.dataset.copy = body;
    previewEl.classList.remove("fade-in");
    void previewEl.offsetWidth;
    previewEl.classList.add("fade-in");
  }

  function copy(btn) {
    const text = btn.dataset.copy || "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  keyCopyBtn.addEventListener("click", () => copy(keyCopyBtn));
  bodyCopyBtn.addEventListener("click", () => copy(bodyCopyBtn));

  let timer;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => renderList(searchInput.value), 300);
  });

  renderList();
  if (location.hash) {
    const key = decodeURIComponent(location.hash.slice(1));
    const el = listPlaceholder.querySelector(`[data-key="${key}"]`);
    if (el) {
      select(key);
      el.scrollIntoView({ block: "center" });
    }
  }

  initTooltips();
}

onDomReady(setupTooltipViewerPage);
