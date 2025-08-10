import { parseTooltipText } from "../tooltip.js";
import { SidebarList } from "../../components/SidebarList.js";

export const INVALID_TOOLTIP_MSG = "Empty or whitespace-only content";
export const MALFORMED_TOOLTIP_MSG = "Unbalanced markup detected";
export const INVALID_KEY_MSG = "Invalid key format (prefix.name)";
const KEY_PATTERN = /^[a-z]+\.[\w-]+$/;

/**
 * Render a list of tooltip entries filtered by search terms.
 *
 * @pseudocode
 * 1. Build an array of list item configs from matching tooltip entries.
 * 2. Use {@link SidebarList} to create a list and wire selection to `select`.
 * 3. Append a warning icon and screen-reader text for invalid or malformed entries.
 * 4. Replace the previous list element and return the new element and select binding.
 *
 * @param {Record<string,string>} data - Flattened tooltips map.
 * @param {string} filter - Search filter string.
 * @param {(key: string) => void} select - Callback when an item is selected.
 * @param {HTMLElement} listPlaceholder - Current list element to replace.
 * @returns {{ element: HTMLElement, listSelect: (index: number) => void }}
 */
export function renderList(data, filter, select, listPlaceholder) {
  const items = [];
  const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
  Object.entries(data).forEach(([key, body]) => {
    const haystack = `${key} ${body}`.toLowerCase();
    const match = terms.every((t) => haystack.includes(t));
    if (match) {
      const bodyValid = typeof body === "string" && body.trim().length > 0;
      const keyValid = KEY_PATTERN.test(key);
      const valid = bodyValid && keyValid;
      const { warning } = parseTooltipText(body);
      const prefix = key.split(".")[0];
      items.push({
        label: key,
        className: prefix,
        dataset: {
          key,
          body,
          valid: String(valid),
          warning: String(warning),
          keyValid: String(keyValid)
        }
      });
    }
  });
  const list = new SidebarList(items, (_, el) => {
    select(el.dataset.key);
  });
  Array.from(list.element.children).forEach((li) => {
    let message = null;
    if (li.dataset.keyValid === "false") {
      message = INVALID_KEY_MSG;
    } else if (li.dataset.valid === "false") {
      message = INVALID_TOOLTIP_MSG;
    } else if (li.dataset.warning === "true") {
      message = MALFORMED_TOOLTIP_MSG;
    }
    if (message) {
      const icon = document.createElement("span");
      icon.className = "tooltip-invalid-icon";
      icon.textContent = "!";
      icon.title = message;
      icon.setAttribute("aria-hidden", "true");
      const sr = document.createElement("span");
      sr.className = "tooltip-invalid-text";
      sr.textContent = message;
      li.append(" ", icon, sr);
    }
  });
  list.element.id = "tooltip-list";
  if (listPlaceholder) listPlaceholder.replaceWith(list.element);
  return { element: list.element, listSelect: list.select.bind(list) };
}
