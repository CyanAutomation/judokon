/**
 * Toggle switch UI component for settings controls.
 *
 * @pseudocode
 * 1. Create a wrapper div with class `settings-item`.
 * 2. Create a control row to keep toggle controls aligned across items.
 * 3. Build a label containing a checkbox input, slider div and text span.
 * 4. Apply provided options such as `id`, `name`, `checked`, `aria-label` and `tooltipId` to the input.
 * 5. Append the label into the control row and store references to the wrapper and input.
 * 6. Wire a change event to keep the instance's `checked` state in sync with the input element.
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

    const controlRow = document.createElement("div");
    controlRow.className = "settings-item__control-row";

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
    controlRow.appendChild(label);
    this.element.appendChild(controlRow);

    this.input = input;
    this.controlRow = controlRow;
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

  /**
   * Add or update description content for this switch.
   *
   * @param {string} text - Description text.
   * @param {{ id?: string }} [options] - Description options.
   * @returns {HTMLParagraphElement} Description element.
   */
  setDescription(text, options = {}) {
    if (!this.descriptionRow) {
      this.descriptionRow = document.createElement("div");
      this.descriptionRow.className = "settings-item__description-row";
      this.element.appendChild(this.descriptionRow);
    }

    if (!this.descriptionElement) {
      this.descriptionElement = document.createElement("p");
      this.descriptionElement.className = "settings-description";
      this.descriptionRow.appendChild(this.descriptionElement);
    }

    if (options.id) {
      this.descriptionElement.id = options.id;
    }

    this.descriptionElement.textContent = text;
    return this.descriptionElement;
  }
}
