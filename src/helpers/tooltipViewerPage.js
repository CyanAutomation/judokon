import { fetchJson } from "./dataUtils.js";
import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";

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
  const listEl = document.getElementById("tooltip-list");
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

  function createItem(key, body) {
    const li = document.createElement("li");
    li.tabIndex = 0;
    li.textContent = key;
    const valid = typeof body === "string" && body.trim().length > 0;
    li.dataset.key = key;
    li.dataset.body = body;
    li.dataset.valid = String(valid);
    if (!valid) li.classList.add("invalid");
    li.addEventListener("click", () => select(key));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(key);
      }
    });
    return li;
  }

  function renderList(filter = "") {
    listEl.textContent = "";
    const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
    Object.entries(data).forEach(([key, body]) => {
      const haystack = `${key} ${body}`.toLowerCase();
      const match = terms.every((t) => haystack.includes(t));
      if (match) listEl.appendChild(createItem(key, body));
    });
  }

  let selectedKey;
  function select(key) {
    selectedKey = key;
    const body = data[key] ?? "";
    Array.from(listEl.children).forEach((el) => {
      el.classList.toggle("selected", el.dataset.key === key);
    });
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
    const el = listEl.querySelector(`[data-key="${key}"]`);
    if (el) {
      select(key);
      el.scrollIntoView({ block: "center" });
    }
  }

  initTooltips();
}

onDomReady(setupTooltipViewerPage);
