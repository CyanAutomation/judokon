/**
 * Toggle switch UI component for settings controls.
 *
 * @pseudocode
 * 1. Create a wrapper div with class `settings-item`.
 * 2. Build a label containing a checkbox input, slider div and text span.
 * 3. Apply provided options such as `id`, `name`, `checked`, `aria-label` and `tooltipId` to the input.
 * 4. Append the label to the wrapper and store references to the wrapper and input.
 * 5. Wire a change event to keep the instance's `checked` state in sync with the input element.
 */
export class ToggleSwitch {
  /**
   * @param {string} labelText - Visible text for the toggle label.
   * @param {object} [options] - Additional configuration.
   * @param {string} [options.id] - Id attribute for the input/label.
   * @param {string} [options.name] - Name attribute for the input.
   * @param {boolean} [options.checked=false] - Initial checked state.
   * @param {string} [options.ariaLabel] - Custom ARIA label, defaults to labelText.
   * @param {string} [options.tooltipId] - Tooltip identifier to attach to the input.
   */
  constructor(labelText, options = {}) {
    const { id, name, checked = false, ariaLabel = labelText, tooltipId } = options;

    this.element = document.createElement("div");
    this.element.className = "settings-item";

    const label = document.createElement("label");
    label.className = "switch";
    if (id) label.htmlFor = id;

    const input = document.createElement("input");
    input.type = "checkbox";
    if (id) input.id = id;
    if (name) input.name = name;
    input.checked = checked;
    input.setAttribute("aria-label", ariaLabel);
    if (tooltipId) input.dataset.tooltipId = tooltipId;

    const slider = document.createElement("div");
    slider.className = "slider round";

    const span = document.createElement("span");
    span.textContent = labelText;

    label.append(input, slider, span);
    this.element.appendChild(label);

    this.input = input;
    this.checked = input.checked;
    input.addEventListener("change", () => {
      this.checked = input.checked;
    });
  }

  /**
   * Determine whether the switch is checked.
   * @returns {boolean} Current checked state.
   */
  isChecked() {
    return this.input.checked;
  }

  /**
   * Set the switch checked state.
   * @param {boolean} value - Desired checked value.
   */
  setChecked(value) {
    this.input.checked = value;
    this.checked = value;
  }
}
