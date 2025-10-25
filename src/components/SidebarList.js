/**
 * Sidebar list rendered as a native radio group.
 *
 * @pseudocode
 * 1. Create a `<fieldset>` with a visually hidden `<legend>` and apply `sidebar-list` styling.
 * 2. For each provided item build a radio input + label pair wrapped in a div for zebra striping.
 * 3. Mirror optional dataset and className values onto the label element to preserve semantics.
 * 4. Listen for native `change` events on each radio and delegate to `select(index)`.
 * 5. Inside `select()` update the checked radio, manage `aria-current`, pulse animation, and invoke `onSelect`.
 * 6. Expose the radio labels through `this.elements` for compatibility with existing utilities.
 */
export class SidebarList {
  static #groupCount = 0;

  /**
   * @param {Array<string|object>} items - Labels or config objects.
   * @param {Function} [onSelect=() => {}] - Callback invoked with the new index.
   */
  constructor(items = [], onSelect = () => {}) {
    this.onSelect = onSelect;
    this.current = -1;
    this.inputs = [];
    this.labels = [];

    this.element = this.#createFieldset();
    this.legend = this.element.querySelector("legend");

    if (!items.length) {
      this.elements = this.labels;
      return;
    }

    const groupName = `sidebar-list-${SidebarList.#groupCount++}`;
    items.forEach((item, index) => {
      const { wrapper, input, label } = this.#createOption(item, index, groupName);
      this.element.appendChild(wrapper);
      this.inputs.push(input);
      this.labels.push(label);
    });

    this.elements = this.labels;
  }

  #createFieldset() {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "sidebar-list";
    fieldset.setAttribute("role", "radiogroup");
    const legend = document.createElement("legend");
    legend.className = "sidebar-list__legend";
    legend.textContent = "Choose an item";
    fieldset.appendChild(legend);
    return fieldset;
  }

  #createOption(item, index, groupName) {
    const wrapper = document.createElement("div");
    wrapper.className = "sidebar-list__option";
    wrapper.classList.add(index % 2 === 0 ? "odd" : "even");

    const inputId = `${groupName}-${index}`;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = groupName;
    input.value = String(index);
    input.id = inputId;
    input.className = "sidebar-list__input";

    const label = document.createElement("label");
    label.className = "sidebar-list__label";
    label.htmlFor = inputId;

    if (typeof item === "string") {
      label.textContent = item;
    } else if (item && typeof item === "object") {
      label.textContent = item.label || "";
      if (item.className) {
        label.classList.add(...String(item.className).split(/\s+/).filter(Boolean));
      }
      if (item.dataset) {
        Object.entries(item.dataset).forEach(([key, value]) => {
          label.dataset[key] = value;
        });
      }
    }

    input.addEventListener("change", (event) => {
      if (!input.checked) return;
      this.select(index, { event, focus: false });
    });

    wrapper.append(input, label);
    return { wrapper, input, label };
  }

  #prefersReducedMotion() {
    try {
      const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      return Boolean(query?.matches);
    } catch (error) {
      void error;
      return false;
    }
  }

  /**
   * Select an item by index.
   *
   * @param {number} index - Item index to highlight.
   * @param {object} [opts={}] - Options passed to `onSelect`.
   * @param {boolean} [opts.focus=true] - Whether to focus the selected radio.
   * @param {boolean} [opts.silent=false] - Skip invoking `onSelect`.
   * @returns {void}
   */
  select(index, opts = {}) {
    if (!this.inputs.length) return;

    const { focus = true, silent = false } = opts;
    const payload = { ...opts, focus, silent };
    const length = this.inputs.length;
    this.current = ((index % length) + length) % length;
    const reduceMotion = this.#prefersReducedMotion();

    this.inputs.forEach((input, idx) => {
      const label = this.labels[idx];
      const isCurrent = idx === this.current;
      input.checked = isCurrent;
      if (isCurrent) {
        label.setAttribute("aria-current", "page");
        label.classList.remove("sidebar-list__label--pulse");
        if (!reduceMotion) {
          void label.offsetWidth;
          label.classList.add("sidebar-list__label--pulse");
        }
      } else {
        label.removeAttribute("aria-current");
        label.classList.remove("sidebar-list__label--pulse");
      }
    });

    if (focus) {
      this.inputs[this.current].focus();
    }

    if (!silent) {
      this.onSelect(this.current, this.labels[this.current], payload);
    }
  }
}
