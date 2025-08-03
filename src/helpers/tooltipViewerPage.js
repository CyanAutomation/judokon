import { fetchJson } from "./dataUtils.js";
import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";
import { createSidebarList } from "../components/SidebarList.js";
import { showSnackbar } from "./showSnackbar.js";

const INVALID_TOOLTIP_MSG = "Empty or whitespace-only content";

/**
 * Initialize the Tooltip Viewer page.
 *
 * @pseudocode
 * 1. Load and flatten `tooltips.json` using `fetchJson` and `flattenTooltips`.
 * 2. Render a clickable list of keys filtered by the search box (300ms debounce),
 *    tagging items with a class based on their prefix (e.g. `stat`, `ui`) and
 *    flagging empty bodies with a warning icon.
 * 3. Wrap the preview in a 300px-high container with a toggle button to expand
 *    or collapse long content.
 * 4. When a key is selected, display its parsed HTML and raw text in the
 *    preview, and show a warning when the markup is unbalanced.
 * 5. Provide copy buttons for the key and body using `navigator.clipboard` and
 *    show feedback with a snackbar and button animation.
 * 6. On page load, select the key from the URL hash when present and scroll to
 *    it.
 * 7. Call `initTooltips()` so help icons inside the page gain tooltips.
 */
export async function setupTooltipViewerPage() {
  const searchInput = document.getElementById("tooltip-search");
  let listPlaceholder = document.getElementById("tooltip-list");
  const previewEl = document.getElementById("tooltip-preview");
  const rawEl = document.getElementById("tooltip-raw");
  const warningEl = document.getElementById("tooltip-warning");
  const keyCopyBtn = document.getElementById("copy-key-btn");
  const bodyCopyBtn = document.getElementById("copy-body-btn");

  const previewContainer = document.createElement("div");
  previewContainer.className = "preview-container";
  previewEl.parentNode.insertBefore(previewContainer, previewEl);
  previewContainer.appendChild(previewEl);

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "toggle-preview-btn";
  toggleBtn.className = "secondary-button preview-toggle";
  toggleBtn.type = "button";
  toggleBtn.textContent = "Expand";
  toggleBtn.setAttribute("aria-expanded", "false");
  previewContainer.after(toggleBtn);

  let expanded = false;
  function updateToggle() {
    const needsToggle = previewEl.scrollHeight > 300;
    toggleBtn.hidden = !needsToggle;
    if (!needsToggle) {
      expanded = false;
      previewContainer.classList.remove("expanded");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.textContent = "Expand";
    }
  }

  toggleBtn.addEventListener("click", () => {
    expanded = !expanded;
    previewContainer.classList.toggle("expanded", expanded);
    toggleBtn.textContent = expanded ? "Collapse" : "Expand";
    toggleBtn.setAttribute("aria-expanded", String(expanded));
  });

  updateToggle();

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
        const prefix = key.split(".")[0];
        items.push({
          label: key,
          className: prefix,
          dataset: { key, body, valid: String(valid) }
        });
      }
    });
    const result = createSidebarList(items, (_, el) => {
      select(el.dataset.key);
    });
    Array.from(result.element.children).forEach((li) => {
      if (li.dataset.valid === "false") {
        const icon = document.createElement("span");
        icon.className = "tooltip-invalid-icon";
        icon.textContent = "!";
        icon.title = INVALID_TOOLTIP_MSG;
        icon.setAttribute("aria-hidden", "true");
        const sr = document.createElement("span");
        sr.className = "tooltip-invalid-text";
        sr.textContent = INVALID_TOOLTIP_MSG;
        li.append(" ", icon, sr);
      }
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
    const { html, warning } = parseTooltipText(body);
    previewEl.innerHTML = html;
    rawEl.textContent = body;
    if (warning) {
      warningEl.textContent = "Unbalanced markup detected";
      warningEl.hidden = false;
    } else {
      warningEl.textContent = "";
      warningEl.hidden = true;
    }
    keyCopyBtn.dataset.copy = key;
    bodyCopyBtn.dataset.copy = body;
    previewEl.classList.remove("fade-in");
    void previewEl.offsetWidth;
    previewEl.classList.add("fade-in");
    expanded = false;
    previewContainer.classList.remove("expanded");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.textContent = "Expand";
    updateToggle();
  }

  function copy(btn) {
    const text = btn.dataset.copy || "";
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showSnackbar("Copied");
          btn.classList.add("copied");
          setTimeout(() => btn.classList.remove("copied"), 600);
        })
        .catch(() => {});
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
